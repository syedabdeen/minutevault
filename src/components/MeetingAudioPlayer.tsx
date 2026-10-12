import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, Loader2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { AudioPart } from "@/lib/meetingAudio";

export interface MeetingAudioHandle { seek: (seconds: number) => void }
export const MeetingAudioPlayer = forwardRef<MeetingAudioHandle, { parts: AudioPart[]; onTime: (seconds: number) => void }>(function MeetingAudioPlayer({ parts, onTime }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const wave = useRef<WaveSurfer | null>(null);
  const onTimeRef = useRef(onTime); onTimeRef.current = onTime;
  const pendingSeek = useRef<{ time: number; play: boolean } | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [position, setPosition] = useState(0);
  const [reload, setReload] = useState(0);
  useImperativeHandle(ref, () => ({ seek(seconds) {
    const index = Math.max(0, parts.findIndex(p => seconds >= p.offset && seconds < p.offset + p.duration));
    const local = Math.max(0, seconds - parts[index].offset);
    if (index === partIndex && ready) {
      wave.current?.setTime(local); void wave.current?.play().catch(e => setError(e.message));
    } else { pendingSeek.current = { time: local, play: true }; setPartIndex(index); }
  } }), [parts, partIndex, ready]);
  useEffect(() => {
    const part = parts[partIndex];
    if (!container.current || !part) return;
    let disposed = false;
    setReady(false); setPlaying(false); setError(null);
    const player = WaveSurfer.create({ container: container.current, height: 72, waveColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground")})`, progressColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--accent")})`, cursorColor: `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--accent")})`, barWidth: 3, barGap: 2, normalize: true });
    wave.current = player;
    player.on("timeupdate", time => { setPosition(part.offset + time); onTimeRef.current(part.offset + time); });
    player.on("play", () => setPlaying(true)); player.on("pause", () => setPlaying(false));
    player.on("error", e => { if (!disposed) { setError(e.message); setReady(false); } });
    player.on("ready", () => {
      setReady(true);
      const pending = pendingSeek.current; pendingSeek.current = null;
      if (pending) { player.setTime(pending.time); if (pending.play) void player.play().catch(e => setError(e.message)); }
    });
    player.on("finish", () => {
      if (partIndex + 1 < parts.length) { pendingSeek.current = { time: 0, play: true }; setPartIndex(partIndex + 1); }
    });
    void (async () => {
      try {
        const { data, error } = await supabase.storage.from("meeting-recordings").createSignedUrl(part.path, 3600);
        if (error) throw error;
        if (!disposed) await player.load(data.signedUrl);
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : "Recording unavailable."); }
    })();
    return () => { disposed = true; player.destroy(); wave.current = null; };
  }, [parts, partIndex, reload]);
  useEffect(() => { wave.current?.setPlaybackRate(speed); }, [speed, ready]);
  const format = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const total = parts.reduce((max, p) => Math.max(max, p.offset + p.duration), 0);
  return <Card className="mb-6"><CardHeader><CardTitle className="flex items-center gap-2"><Headphones size={20} /> Private recording</CardTitle></CardHeader><CardContent className="space-y-4">
    <div ref={container} className="w-full min-w-0" />
    {error ? <div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" size="sm" onClick={() => setReload(v => v + 1)}>Reload audio</Button></div> : <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="icon" disabled={!ready} aria-label={playing ? "Pause recording" : "Play recording"} onClick={() => { void wave.current?.playPause().catch(e => setError(e.message)); }}>{!ready ? <Loader2 size={18} className="animate-spin" /> : playing ? <Pause size={18} /> : <Play size={18} />}</Button>
      <span className="text-sm font-mono tabular-nums">{format(position)} / {format(total)}</span>
      <select aria-label="Playback speed" className="bg-background border rounded-md p-2 text-sm" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[0.75, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s}>{s}×</option>)}</select>
      {parts.length > 1 && <select aria-label="Audio part" className="bg-background border rounded-md p-2 text-sm" value={partIndex} onChange={e => { pendingSeek.current = null; setPartIndex(Number(e.target.value)); }}>{parts.map((_, i) => <option key={i} value={i}>Part {i + 1} of {parts.length}</option>)}</select>}
    </div>}
    <p className="text-xs text-muted-foreground">Tap a transcript timestamp to seek. AI timestamps and anonymous speaker labels are approximate; speakers are not matched across audio parts.</p>
  </CardContent></Card>;
});