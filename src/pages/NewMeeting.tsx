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
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function NewMeeting() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [speakersDetected, setSpeakersDetected] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (!title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }
    setIsRecording(true);
    toast.success("Recording started", {
      description: "Speak clearly for best transcription results",
    });

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    // Simulate speaker detection
    setTimeout(() => setSpeakersDetected(1), 2000);
    setTimeout(() => setSpeakersDetected(2), 5000);
    setTimeout(() => setSpeakersDetected(3), 10000);
  };

  const handleStop = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    toast.success("Recording stopped", {
      description: "Processing audio and generating transcript...",
    });

    // Simulate processing and navigate to meeting detail
    setTimeout(() => {
      navigate("/meeting/new-recording");
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Waveform animation bars
  const WaveformBars = () => (
    <div className="flex items-end gap-1 h-16">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 bg-gradient-to-t from-primary to-accent rounded-full waveform-bar"
          style={{
            height: isRecording ? `${Math.random() * 100}%` : "20%",
            animationDelay: `${i * 0.05}s`,
            minHeight: "8px",
          }}
        />
      ))}
    </div>
  );

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
        {!isRecording && (
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
        <Card className={`transition-all duration-500 ${isRecording ? "border-destructive/50 shadow-[0_0_40px_hsl(0_72%_51%/0.2)]" : ""}`}>
          <CardContent className="p-8">
            <div className="flex flex-col items-center">
              {/* Recording Status */}
              <div className="mb-8 text-center">
                {isRecording ? (
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
                <WaveformBars />
              </div>

              {/* Stats */}
              {isRecording && (
                <div className="flex items-center gap-8 mb-8 fade-in">
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={18} className="text-primary" />
                    <span>
                      {speakersDetected} speaker{speakersDetected !== 1 ? "s" : ""}{" "}
                      detected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle size={18} />
                    <span>Audio quality: Excellent</span>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4">
                {!isRecording ? (
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
        {!isRecording && (
          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <AlertCircle size={24} className="text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Tips for Best Results</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ensure you're in a quiet environment</li>
                    <li>• Ask participants to speak clearly and one at a time</li>
                    <li>
                      • Speakers can introduce themselves for better identification
                    </li>
                    <li>• Position the microphone centrally for group meetings</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
