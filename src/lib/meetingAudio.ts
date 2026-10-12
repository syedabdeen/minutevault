import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDraft, materializeDraft, saveDraft, discardDraft } from "./recordingStore";

export interface AudioPart { path: string; duration: number; offset: number }
export interface AudioAnalysis {
  summary: string;
  actionItems: { task: string; responsible: string; dueDate: string; status: string }[];
  transcripts: { speaker: string; content: string; startSeconds: number; endSeconds: number }[];
}
export async function processSegment(meetingId: string, segmentIndex: number, resumeAccess = false): Promise<AudioAnalysis> {
  const { data, error } = await supabase.functions.invoke("process-meeting-audio", { body: { meetingId, segmentIndex, resumeAccess } });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      try { message = JSON.parse(text).error || text; } catch { message = text; }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as AudioAnalysis;
}
export async function finishAnalysis(meetingId: string, onProgress: (message: string) => void, resumeAccess = false) {
  const { data: segments, error } = await supabase.from("meeting_audio_segments").select("*").eq("meeting_id", meetingId).order("segment_index");
  if (error) throw error;
  if (!segments?.length) throw new Error("No recording segments are available.");
  const results: { result: AudioAnalysis; offset: number; index: number }[] = [];
  for (const segment of segments) {
    onProgress(`Analyzing audio ${segment.segment_index + 1} of ${segments.length}…`);
    const result = segment.status === "completed" && segment.result
      ? segment.result as unknown as AudioAnalysis
      : await processSegment(meetingId, segment.segment_index, resumeAccess);
    results.push({ result, offset: segment.offset_seconds, index: segment.segment_index });
  }
  const { data: meeting, error: meetingError } = await supabase.from("meetings").select("created_at").eq("id", meetingId).single();
  if (meetingError) throw meetingError;
  const entries = results.flatMap(({ result, offset, index }) => result.transcripts.map(t => ({
    meeting_id: meetingId,
    // Anonymous labels remain local to each segment; do not imply acoustic matching across segments.
    speaker: segments.length > 1 && /speaker/i.test(t.speaker) ? `${t.speaker} · Part ${index + 1}` : t.speaker,
    content: t.content, start_seconds: offset + t.startSeconds, end_seconds: offset + t.endSeconds,
    timestamp: new Date(new Date(meeting.created_at).getTime() + (offset + t.startSeconds) * 1000).toISOString(),
  })));
  const { error: deleteError } = await supabase.from("transcripts").delete().eq("meeting_id", meetingId);
  if (deleteError) throw deleteError;
  if (entries.length) {
    const { error: insertError } = await supabase.from("transcripts").insert(entries);
    if (insertError) throw insertError;
  }
  const { error: updateError } = await supabase.from("meetings").update({
    summary: results.map(r => r.result.summary).filter(Boolean).join("\n\n") || null,
    action_items: results.flatMap(r => r.result.actionItems),
    speakers: new Set(entries.map(t => t.speaker)).size,
    status: "completed", processing_error: entries.length ? null : "No speech was detected in this recording.",
  }).eq("id", meetingId);
  if (updateError) throw updateError;
}
export async function saveAndProcessDraft(draftId: string, onProgress: (message: string) => void) {
  let draft = await getDraft(draftId);
  if (!draft) throw new Error("The local recording could not be found.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== draft.userId) throw new Error("Sign in to the account that recorded this meeting.");
  const parts = await materializeDraft(draft.id);
  if (!parts.length || draft.duration < 0.3) throw new Error("The recording is empty or too short.");
  let meetingId = draft.meetingId;
  if (!meetingId) {
    const { data: meeting, error } = await supabase.from("meetings").insert({
      user_id: user.id, title: draft.title, participant_names: draft.participants || null,
      meeting_type: draft.meetingType, date: draft.date, time: draft.time,
      duration: `${Math.max(1, Math.round(draft.duration / 60))} min`,
      audio_duration_seconds: draft.duration, status: "processing",
    }).select("id").single();
    if (error) throw error;
    meetingId = meeting.id; draft = { ...draft, meetingId }; await saveDraft(draft);
  }
  const id = meetingId;
  try {
    const audioParts: AudioPart[] = [];
    for (const part of parts) {
      onProgress(`Saving audio ${part.index + 1} of ${parts.length}…`);
      const path = `${user.id}/${id}/${part.index}.wav`;
      const { data: existing, error: existingError } = await supabase.from("meeting_audio_segments").select("id").eq("meeting_id", id).eq("segment_index", part.index).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) {
        const { error: uploadError } = await supabase.storage.from("meeting-recordings").upload(path, part.file, { contentType: "audio/wav", upsert: false });
        if (uploadError && !uploadError.message.toLowerCase().includes("already exists")) throw uploadError;
        const { error: insertError } = await supabase.from("meeting_audio_segments").insert({ meeting_id: id, user_id: user.id, segment_index: part.index, storage_path: path, duration_seconds: part.duration, offset_seconds: part.offset });
        if (insertError) throw insertError;
      }
      audioParts.push({ path, duration: part.duration, offset: part.offset });
    }
    const { error: metadataError } = await supabase.from("meetings").update({ audio_url: audioParts[0]?.path, audio_parts: JSON.parse(JSON.stringify(audioParts)), status: "processing", processing_error: null }).eq("id", id);
    if (metadataError) throw metadataError;
    await finishAnalysis(id, onProgress);
    await discardDraft(draftId);
    return id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audio processing failed.";
    await supabase.from("meetings").update({ status: "failed", processing_error: message }).eq("id", id);
    throw new Error(`${message} Your recording remains saved on this device.`);
  }
}