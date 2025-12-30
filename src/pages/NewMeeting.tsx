import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mic,
  Square,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  MicOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { supabase } from "@/integrations/supabase/client";

export default function NewMeeting() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(
    Array(20).fill(20)
  );

  const {
    isConnecting,
    isConnected,
    transcripts,
    partialText,
    speakersDetected,
    error,
    startRecording,
    stopRecording,
    getFullTranscript,
  } = useAudioRecording();

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Waveform animation
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setWaveformHeights(
          Array(20)
            .fill(0)
            .map(() => Math.random() * 100)
        );
      }, 100);
      return () => clearInterval(interval);
    } else {
      setWaveformHeights(Array(20).fill(20));
    }
  }, [isConnected]);

  // Timer
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error("Recording Error", { description: error });
    }
  }, [error]);

  const handleStart = async () => {
    if (!title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    toast.info("Requesting microphone access...", {
      description: "Please allow microphone access when prompted",
    });

    const success = await startRecording();
    if (success) {
      toast.success("Recording started", {
        description: "Speak clearly for best transcription results",
      });
    }
  };

  const handleStop = async () => {
    await stopRecording();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    toast.success("Recording stopped", {
      description: "Saving meeting to database...",
    });

    try {
      // Format duration
      const hrs = Math.floor(recordingTime / 3600);
      const mins = Math.floor((recordingTime % 3600) / 60);
      let durationStr = "";
      if (hrs > 0) durationStr += `${hrs}h `;
      if (mins > 0) durationStr += `${mins}min`;
      if (!durationStr) durationStr = "< 1 min";

      // Save meeting to database
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          title,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toTimeString().slice(0, 8),
          duration: durationStr.trim(),
          speakers: speakersDetected,
          status: "completed",
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Save transcripts to database
      if (transcripts.length > 0) {
        const transcriptInserts = transcripts.map((t) => ({
          meeting_id: meeting.id,
          speaker: t.speaker,
          content: t.text,
          timestamp: new Date().toISOString(),
        }));

        const { error: transcriptError } = await supabase
          .from("transcripts")
          .insert(transcriptInserts);

        if (transcriptError) throw transcriptError;
      }

      toast.success("Meeting saved successfully!");

      // Navigate to meeting detail
      navigate(`/meeting/${meeting.id}`);
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error("Failed to save meeting", {
        description: "Please try again",
      });
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">New Meeting</h1>
          <p className="text-muted-foreground mt-1">
            Start recording to capture and transcribe your meeting
          </p>
        </div>

        {/* Meeting Setup */}
        {!isConnected && !isConnecting && (
          <Card className="mb-8 fade-in">
            <CardHeader>
              <CardTitle>Meeting Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Weekly Team Standup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    defaultValue={new Date().toTimeString().slice(0, 5)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recording Interface */}
        <Card
          className={`transition-all duration-500 ${
            isConnected
              ? "border-destructive/50 shadow-[0_0_40px_hsl(0_72%_51%/0.2)]"
              : ""
          }`}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              {/* Recording Status */}
              <div className="mb-8 text-center">
                {isConnecting ? (
                  <div className="flex items-center gap-2 text-accent">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-medium">
                      Connecting to transcription service...
                    </span>
                  </div>
                ) : isConnected ? (
                  <>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <div className="w-3 h-3 rounded-full bg-destructive recording-pulse" />
                      <span className="text-sm font-medium uppercase tracking-wider">
                        Recording in Progress
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold">{title}</h2>
                  </>
                ) : (
                  <h2 className="text-xl text-muted-foreground">
                    Ready to record
                  </h2>
                )}
              </div>

              {/* Timer */}
              <div className="text-6xl font-mono font-bold mb-8 tabular-nums">
                {formatTime(recordingTime)}
              </div>

              {/* Waveform */}
              <div className="w-full max-w-md mb-8">
                <div className="flex items-end justify-center gap-1 h-16">
                  {waveformHeights.map((height, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-accent to-accent/60 rounded-full transition-all duration-100"
                      style={{
                        height: `${Math.max(height, 8)}%`,
                        minHeight: "8px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Live Transcript Preview */}
              {isConnected && (transcripts.length > 0 || partialText) && (
                <div className="w-full max-w-2xl mb-8 p-4 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic size={16} className="text-accent" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Live Transcript
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transcripts.slice(-5).map((t) => (
                      <div key={t.id} className="text-sm">
                        <span className="text-accent font-medium">
                          {t.speaker}:
                        </span>{" "}
                        <span className="text-foreground">{t.text}</span>
                      </div>
                    ))}
                    {partialText && (
                      <div className="text-sm text-muted-foreground italic">
                        {partialText}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              {isConnected && (
                <div className="flex items-center gap-8 mb-8 fade-in">
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={18} className="text-accent" />
                    <span>
                      {speakersDetected} speaker
                      {speakersDetected !== 1 ? "s" : ""} detected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle size={18} />
                    <span>Transcribing live</span>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4">
                {isConnecting ? (
                  <Button variant="outline" size="xl" disabled className="min-w-[200px]">
                    <Loader2 size={24} className="animate-spin" />
                    Connecting...
                  </Button>
                ) : !isConnected ? (
                  <Button
                    variant="gradient"
                    size="xl"
                    onClick={handleStart}
                    className="min-w-[200px]"
                  >
                    <Mic size={24} />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    variant="recording"
                    size="xl"
                    onClick={handleStop}
                    className="min-w-[200px]"
                  >
                    <Square size={20} className="fill-current" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        {!isConnected && !isConnecting && (
          <Card className="mt-8 bg-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <AlertCircle size={24} className="text-accent flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Tips for Best Results</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ensure you're in a quiet environment</li>
                    <li>• Ask participants to speak clearly and one at a time</li>
                    <li>
                      • Speakers can introduce themselves for better identification
                    </li>
                    <li>• Position the microphone centrally for group meetings</li>
                    <li>• Grant microphone permission when prompted</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Microphone Permission Error */}
        {error && (
          <Card className="mt-8 bg-destructive/5 border-destructive/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <MicOff size={24} className="text-destructive flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2 text-destructive">
                    Microphone Access Required
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {error}. Please check your browser settings and allow
                    microphone access for this site.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
