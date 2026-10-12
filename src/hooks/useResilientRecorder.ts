import { useCallback, useEffect, useRef, useState } from "react";
import { getDraft, saveDraft, savePCM, type RecordingDraft } from "@/lib/recordingStore";

export function useResilientRecorder() {
  const [isRecording, setRecording] = useState(false);
  const [isStarting, setStarting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const contextRef = useRef<AudioContext>();
  const streamRef = useRef<MediaStream>();
  const nodeRef = useRef<AudioWorkletNode | ScriptProcessorNode>();
  const sourceRef = useRef<MediaStreamAudioSourceNode>();
  const draftRef = useRef<RecordingDraft>();
  const pendingRef = useRef<Float32Array[]>([]);
  const sampleCountRef = useRef(0);
  const indexRef = useRef(0);
  const writeRef = useRef<Promise<unknown>>(Promise.resolve());
  const wakeRef = useRef<WakeLockSentinel>();
  const flush = useCallback(() => {
    const draft = draftRef.current;
    if (!draft || !sampleCountRef.current) return;
    const pcm = new Float32Array(sampleCountRef.current);
    let offset = 0;
    for (const chunk of pendingRef.current) { pcm.set(chunk, offset); offset += chunk.length; }
    pendingRef.current = []; sampleCountRef.current = 0;
    const index = indexRef.current++;
    writeRef.current = writeRef.current.then(() => savePCM(draft.id, index, pcm)).catch(() => {
      setError("Your device could not save the recording backup. Stop recording and free some storage.");
      streamRef.current?.getTracks().forEach(track => track.stop());
      setRecording(false);
      throw new Error("Local backup failed");
    });
    // Keep the rejection observed even if the user leaves before stopping.
    void writeRef.current.catch(() => {});
  }, []);
  const receive = useCallback((input: Float32Array, sampleRate: number) => {
    const ratio = sampleRate / 16000;
    const samples = new Float32Array(Math.floor(input.length / ratio));
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      let sum = 0, count = 0;
      for (let k = Math.floor(i * ratio); k < Math.min(input.length, Math.floor((i + 1) * ratio)); k++) { sum += input[k]; count++; }
      samples[i] = count ? sum / count : 0; sumSquares += samples[i] ** 2;
    }
    setLevel(Math.min(1, Math.sqrt(sumSquares / Math.max(1, samples.length)) * 8));
    pendingRef.current.push(samples); sampleCountRef.current += samples.length;
    setDuration(prev => prev + samples.length / 16000);
    if (sampleCountRef.current >= 48000) flush();
  }, [flush]);
  const stop = useCallback(async () => {
    setRecording(false);
    nodeRef.current?.disconnect(); sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    flush();
    try { await writeRef.current; } finally {
      await contextRef.current?.close(); contextRef.current = undefined;
      try { await wakeRef.current?.release(); } catch { /* The browser may already have released it. */ }
      wakeRef.current = undefined;
    }
    setLevel(0);
    const draft = draftRef.current;
    if (!draft) return null;
    const saved = await getDraft(draft.id);
    if (!saved) throw new Error("Recording backup was not found.");
    const ready = { ...saved, state: "ready" as const };
    await saveDraft(ready); return ready;
  }, [flush]);
  const start = useCallback(async (draft: RecordingDraft) => {
    if (contextRef.current || isStarting) return false;
    setStarting(true); setError(null); setInterrupted(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone recording is unavailable on this device or connection.");
      // iOS Safari: create and resume the audio engine inside the tap, before any await.
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new Ctx(); contextRef.current = context;
      const resuming = context.resume().catch(() => {});
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      } catch (e) {
        const name = (e as DOMException)?.name;
        throw new Error(name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone permission was denied. On iPhone open Settings › Safari › Microphone and choose Allow, then try again."
          : name === "NotFoundError" ? "No microphone was found on this device." : "The microphone could not be started. Close other apps using it and try again.");
      }
      streamRef.current = stream;
      await resuming; if (context.state !== "running") await context.resume().catch(() => {});
      await saveDraft(draft); draftRef.current = draft;
      pendingRef.current = []; sampleCountRef.current = 0; indexRef.current = 0; writeRef.current = Promise.resolve();
      setDuration(0);
      const source = context.createMediaStreamSource(stream); sourceRef.current = source;
      if (context.audioWorklet) {
        try {
          await context.audioWorklet.addModule("/pcm-recorder.js");
          const node = new AudioWorkletNode(context, "pcm-recorder");
          node.port.onmessage = event => receive(event.data as Float32Array, context.sampleRate);
          nodeRef.current = node;
        } catch { nodeRef.current = undefined; }
      }
      if (!nodeRef.current) {
        const node = context.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = event => receive(new Float32Array(event.inputBuffer.getChannelData(0)), context.sampleRate);
        nodeRef.current = node;
      }
      const node = nodeRef.current;
      if (!node) throw new Error("Could not initialize microphone.");
      const silent = context.createGain(); silent.gain.value = 0;
      source.connect(node); node.connect(silent); silent.connect(context.destination);
      const warn = () => { flush(); setInterrupted(true); };
      context.onstatechange = () => { if (context.state === "suspended") warn(); };
      stream.getAudioTracks().forEach(track => { track.onended = warn; track.onmute = warn; });
      if (navigator.wakeLock) {
        try { wakeRef.current = await navigator.wakeLock.request("screen"); } catch { /* Optional on unsupported devices. */ }
      }
      setRecording(true); return true;
    } catch (err) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      await contextRef.current?.close(); contextRef.current = undefined;
      setError(err instanceof Error ? err.message : "Could not start recording."); return false;
    } finally { setStarting(false); }
  }, [isStarting, receive, flush]);
  useEffect(() => {
    const leaving = (event: BeforeUnloadEvent) => {
      if (contextRef.current) { flush(); event.preventDefault(); event.returnValue = ""; }
    };
    const background = () => { if (document.hidden && contextRef.current) { flush(); setInterrupted(true); } };
    window.addEventListener("beforeunload", leaving); document.addEventListener("visibilitychange", background);
    return () => {
      window.removeEventListener("beforeunload", leaving); document.removeEventListener("visibilitychange", background);
      flush(); nodeRef.current?.disconnect(); sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach(track => track.stop());
      void contextRef.current?.close(); void wakeRef.current?.release();
    };
  }, [flush]);
  const resume = async () => {
    try { await contextRef.current?.resume(); setInterrupted(false); }
    catch { setError("Microphone was interrupted. Stop and save the recording captured so far."); }
  };
  return { isRecording, isStarting, duration, level, error, interrupted, start, stop, resume };
}