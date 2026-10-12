import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, Upload, ShieldCheck, AlertCircle, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useResilientRecorder } from "@/hooks/useResilientRecorder";
import { supabase } from "@/integrations/supabase/client";
import { listDrafts, discardDraft, importAudio, type RecordingDraft } from "@/lib/recordingStore";
import { saveAndProcessDraft } from "@/lib/meetingAudio";

export default function NewMeeting() {
  const navigate = useNavigate();
  const recorder = useResilientRecorder();
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [title, setTitle] = useState("New Meeting");
  const [participants, setParticipants] = useState("");
  const [meetingType, setMeetingType] = useState("corporate");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<RecordingDraft[]>([]);
  const loadDrafts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setDrafts(await listDrafts(user.id));
  };
  useEffect(() => { void loadDrafts().catch(() => setFailure("Local recording recovery is unavailable on this device.")); }, []);
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  const makeDraft = async (): Promise<RecordingDraft> => {
    if (!title.trim()) throw new Error("Please enter a meeting title.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please sign in to record a meeting.");
    return { id: crypto.randomUUID(), userId: user.id, title: title.trim(), participants: participants.trim(), meetingType, date, time, createdAt: Date.now(), duration: 0, state: "recording" };
  };
  const process = async (id: string) => {
    const meetingId = await saveAndProcessDraft(id, setProgress);
    toast.success("Meeting saved and analyzed"); navigate(`/meeting/${meetingId}`);
  };
  const recover = async (id: string) => {
    setBusy(true); setFailure(null);
    try { await process(id); }
    catch (error) { setFailure(error instanceof Error ? error.message : "Could not save recording."); }
    finally { setBusy(false); setProgress(""); await loadDrafts(); }
  };
  const start = async () => {
    setFailure(null);
    try {
      if (await recorder.start(await makeDraft())) toast.success("Recording started — local backup enabled");
    } catch (error) { setFailure(error instanceof Error ? error.message : "Could not start recording."); }
  };
  const stop = async () => {
    setBusy(true); setFailure(null); setProgress("Saving your local backup…");
    try { const draft = await recorder.stop(); if (draft) await process(draft.id); }
    catch (error) { setFailure(error instanceof Error ? error.message : "Could not save recording."); }
    finally { setBusy(false); setProgress(""); await loadDrafts(); }
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true); setFailure(null); setProgress("Preparing audio on this device…");
    try {
      const draft = await makeDraft(); await importAudio(file, draft); await process(draft.id);
    } catch (error) { setFailure(error instanceof Error ? error.message : "This audio file could not be processed."); }
    finally { setBusy(false); setProgress(""); await loadDrafts(); }
  };
  const seconds = Math.floor(recorder.duration);
  const formatted = `${Math.floor(seconds / 3600).toString().padStart(2, "0")}:${Math.floor(seconds / 60 % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const locked = recorder.isRecording || recorder.isStarting || busy;
  return <Layout><div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
    <div><h1 className="text-3xl font-bold">New Meeting</h1><p className="text-muted-foreground mt-1">Record locally or upload audio. Get a transcript, decisions and action items after recording.</p></div>
    {!locked && drafts.length > 0 && <Card className="border-warning/40"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><RotateCcw size={20} /> Recover unsaved recordings</CardTitle></CardHeader><CardContent className="space-y-3">
      {drafts.map(draft => <div key={draft.id} className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{draft.title}</p><p className="text-xs text-muted-foreground">{Math.floor(draft.duration / 60)} min · {new Date(draft.createdAt).toLocaleString()}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => recover(draft.id)}>Recover & analyze</Button><Button size="icon" variant="ghost" aria-label={`Delete local backup for ${draft.title}`} onClick={async () => { if (window.confirm("Permanently delete this local recording backup?")) { await discardDraft(draft.id); await loadDrafts(); } }}><Trash2 size={16} /></Button></div></div>)}
    </CardContent></Card>}
    {!locked && <Card><CardHeader><CardTitle>Meeting Details</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-2"><Button variant={mode === "record" ? "default" : "outline"} onClick={() => setMode("record")}><Mic size={18} /> Record</Button><Button variant={mode === "upload" ? "default" : "outline"} onClick={() => setMode("upload")}><Upload size={18} /> Upload audio</Button></div>
      <div className="space-y-2"><Label htmlFor="title">Meeting Title *</Label><Input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></div>
      <div className="space-y-2"><Label htmlFor="participants">Participant names (optional)</Label><Input id="participants" value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Names, separated by commas" maxLength={1000} /><p className="text-xs text-muted-foreground">Names are context, not assumed speaker identities. Uncertain speakers remain anonymous.</p></div>
      <div className="space-y-2"><Label htmlFor="meeting-type">Meeting type</Label><select id="meeting-type" value={meetingType} onChange={e => setMeetingType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="corporate">Business meeting</option><option value="interview">Interview</option><option value="lecture">Lecture / learning</option><option value="personal">Personal voice note</option></select></div>
      <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="date">Date</Label><Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="time">Time</Label><Input id="time" type="time" value={time} onChange={e => setTime(e.target.value)} /></div></div>
      {mode === "upload" && <div className="space-y-2"><Label htmlFor="audio-file">Audio file</Label><Input id="audio-file" type="file" accept=".mp3,.m4a,.wav,.webm,.ogg,.aac,.flac,audio/*" onChange={e => setFile(e.target.files?.[0] || null)} /><p className="text-xs text-muted-foreground">MP3, M4A, WAV, WebM and other device-supported formats · maximum 50 MB. Large files may require a desktop.</p></div>}
    </CardContent></Card>}
    <Card className={recorder.isRecording ? "border-destructive/50" : ""}><CardContent className="p-6 sm:p-8 flex flex-col items-center text-center gap-6">
      {busy ? <><Loader2 size={32} className="animate-spin text-accent" /><p role="status" className="font-medium">{progress || "Processing…"}</p><p className="text-sm text-muted-foreground">Keep this screen open. Your audio backup stays on this device until everything is saved.</p></> : <>
        <p className={recorder.isRecording ? "text-destructive font-medium" : "text-muted-foreground"}>{recorder.isRecording ? "● Recording in progress" : recorder.isStarting ? "Requesting microphone access…" : mode === "record" ? "Ready to record" : file?.name || "Choose an audio file"}</p>
        {mode === "record" && <><div className="text-4xl sm:text-6xl font-mono font-bold tabular-nums">{formatted}</div><div className="flex items-center justify-center gap-1 h-16 w-full" aria-label="Microphone input level">{Array.from({ length: 24 }, (_, i) => <div key={i} className="w-1.5 bg-accent rounded-full transition-all duration-150" style={{ height: `${Math.max(6, recorder.level * 64 * (0.4 + 0.6 * Math.sin((i + 1) / 25 * Math.PI)))}px` }} />)}</div></>}
        {recorder.interrupted && <div className="rounded-lg bg-warning/10 p-4 text-sm">Recording may have been interrupted. Keep the app visible and screen unlocked.<Button variant="outline" size="sm" className="mt-2" onClick={recorder.resume}>Resume microphone</Button></div>}
        {mode === "record" ? recorder.isRecording ? <Button variant="recording" size="xl" onClick={stop}><Square size={20} /> Stop & analyze</Button> : <Button variant="gradient" size="xl" disabled={recorder.isStarting} onClick={start}><Mic size={22} /> {recorder.isStarting ? "Starting…" : "Start Recording"}</Button> : <Button variant="gradient" size="xl" disabled={!file} onClick={upload}><Upload size={20} /> Upload & analyze</Button>}
      </>}
    </CardContent></Card>
    {(failure || recorder.error) && <div role="alert" className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm flex gap-3"><AlertCircle className="shrink-0 text-destructive" size={20} /><p>{failure || recorder.error}</p></div>}
    <Card className="bg-accent/5 border-accent/20"><CardContent className="p-5 flex gap-3"><ShieldCheck size={24} className="text-accent shrink-0" /><div className="text-sm space-y-2"><p className="font-semibold">Local backup. Private cloud storage.</p><p className="text-muted-foreground">Microphone audio is backed up about every three seconds. AI analysis runs after saving, not through a live paid connection. Obtain participant consent before recording.</p><p className="text-muted-foreground">Mobile browsers cannot guarantee recording while locked or backgrounded. Keep this screen visible; a screen wake lock is requested where supported. Speaker labels and timestamps are AI estimates—review important decisions.</p></div></CardContent></Card>
  </div></Layout>;
}
