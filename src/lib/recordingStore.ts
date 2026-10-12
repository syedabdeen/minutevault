import { openDB, type DBSchema } from "idb";

export interface RecordingDraft {
  id: string;
  userId: string;
  title: string;
  participants: string;
  meetingType: string;
  date: string;
  time: string;
  createdAt: number;
  duration: number;
  meetingId?: string;
  state: "recording" | "ready";
}
interface RecordingDB extends DBSchema {
  drafts: { key: string; value: RecordingDraft };
  chunks: {
    key: [string, number];
    value: { draftId: string; index: number; pcm: Float32Array };
    indexes: { draft: string };
  };
  files: {
    key: [string, number];
    value: { draftId: string; index: number; file: Blob; name: string; duration: number; offset: number };
    indexes: { draft: string };
  };
}
const database = () => openDB<RecordingDB>("minutevault-recordings", 1, {
  upgrade(db) {
    db.createObjectStore("drafts", { keyPath: "id" });
    db.createObjectStore("chunks", { keyPath: ["draftId", "index"] }).createIndex("draft", "draftId");
    db.createObjectStore("files", { keyPath: ["draftId", "index"] }).createIndex("draft", "draftId");
  },
});
export const saveDraft = async (draft: RecordingDraft) => (await database()).put("drafts", draft);
export const listDrafts = async (userId: string) => (await (await database()).getAll("drafts"))
  .filter(d => d.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
export const getDraft = async (id: string) => (await database()).get("drafts", id);
export async function savePCM(draftId: string, index: number, pcm: Float32Array) {
  const db = await database();
  const tx = db.transaction(["drafts", "chunks"], "readwrite");
  await tx.objectStore("chunks").put({ draftId, index, pcm });
  const draft = await tx.objectStore("drafts").get(draftId);
  if (draft) await tx.objectStore("drafts").put({ ...draft, duration: draft.duration + pcm.length / 16000 });
  await tx.done;
}
export async function discardDraft(id: string) {
  const db = await database();
  const tx = db.transaction(["drafts", "chunks", "files"], "readwrite");
  for (const storeName of ["chunks", "files"] as const) {
    const keys = await tx.objectStore(storeName).index("draft").getAllKeys(id);
    for (const key of keys) await tx.objectStore(storeName).delete(key);
  }
  await tx.objectStore("drafts").delete(id);
  await tx.done;
}
export function encodeWav(chunks: readonly Float32Array[], sampleRate = 16000): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF"); view.setUint32(4, 36 + length * 2, true);
  tag(8, "WAVE"); tag(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, "data"); view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of chunks) for (const value of chunk) {
    const sample = Math.max(-1, Math.min(1, value));
    view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true); offset += 2;
  }
  return new Blob([bytes], { type: "audio/wav" });
}
export async function materializeDraft(id: string) {
  const db = await database();
  const existing = await db.getAllFromIndex("files", "draft", id);
  if (existing.length) return existing.sort((a, b) => a.index - b.index);
  const keys = await db.getAllKeysFromIndex("chunks", "draft", id);
  let chunks: Float32Array[] = [], samples = 0, index = 0, offset = 0;
  const flush = async () => {
    if (!samples) return;
    const duration = samples / 16000;
    await db.put("files", { draftId: id, index, file: encodeWav(chunks), name: `recording-${index}.wav`, duration, offset });
    offset += duration; index++; chunks = []; samples = 0;
  };
  for (const key of keys) {
    const chunk = await db.get("chunks", key);
    if (!chunk) continue;
    chunks.push(chunk.pcm); samples += chunk.pcm.length;
    if (samples >= 16000 * 180) await flush();
  }
  await flush();
  return (await db.getAllFromIndex("files", "draft", id)).sort((a, b) => a.index - b.index);
}
export async function importAudio(file: File, draft: RecordingDraft) {
  if (!file.size) throw new Error("The audio file is empty.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Please choose an audio file smaller than 50 MB.");
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    if (audio.duration < 0.3) throw new Error("The recording is too short.");
    await saveDraft({ ...draft, duration: audio.duration, state: "ready" });
    for (let offset = 0, index = 0; offset < audio.duration; offset += 180, index++) {
      const duration = Math.min(180, audio.duration - offset);
      const offline = new OfflineAudioContext(1, Math.ceil(duration * 16000), 16000);
      const source = offline.createBufferSource(); source.buffer = audio;
      source.connect(offline.destination); source.start(0, offset, duration);
      const rendered = await offline.startRendering();
      const blob = encodeWav([rendered.getChannelData(0)]);
      await (await database()).put("files", { draftId: draft.id, index, file: blob, name: `${file.name}-${index}.wav`, duration, offset });
    }
  } catch (error) {
    await discardDraft(draft.id);
    throw error instanceof Error ? error : new Error("This device could not read that audio format.");
  } finally { await context.close(); }
}