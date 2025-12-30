import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker: string;
}

export function useAudioRecording() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [speakersDetected, setSpeakersDetected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const transcriptCounterRef = useRef(0);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onSessionStarted: () => {
      console.log("ElevenLabs session started");
    },
    onPartialTranscript: (data) => {
      console.log("Partial:", data.text);
    },
    onCommittedTranscript: (data) => {
      console.log("Committed:", data.text);
      if (data.text && data.text.trim()) {
        transcriptCounterRef.current += 1;
        const timestamp = Date.now() - startTimeRef.current;
        const speakerLabel = `Speaker ${((transcriptCounterRef.current - 1) % 4) + 1}`;
        
        setTranscripts(prev => [
          ...prev,
          {
            id: `transcript-${transcriptCounterRef.current}-${Date.now()}`,
            text: data.text,
            timestamp,
            speaker: speakerLabel,
          },
        ]);
        setSpeakersDetected(prev => Math.max(prev, ((transcriptCounterRef.current - 1) % 4) + 1));
      }
    },
    onError: (err) => {
      console.error("Scribe error:", err);
      if (err instanceof Error) {
        setError(err.message || "Transcription error occurred");
      } else {
        setError("Transcription error occurred");
      }
    },
  });

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    startTimeRef.current = Date.now();
    transcriptCounterRef.current = 0;
    setTranscripts([]);
    setSpeakersDetected(0);
    scribe.clearTranscripts();

    try {
      // Get token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke(
        "elevenlabs-scribe-token"
      );

      if (tokenError || !data?.token) {
        console.error("Failed to get scribe token:", tokenError);
        setError("Failed to initialize transcription service. Please try again.");
        setIsConnecting(false);
        return false;
      }

      console.log("Got scribe token, connecting...");

      // Connect using the SDK
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setIsConnecting(false);
      return true;
    } catch (err: unknown) {
      console.error("Error starting recording:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to start recording. Please try again.";
      setError(errorMessage);
      setIsConnecting(false);
      return false;
    }
  }, [scribe]);

  const stopRecording = useCallback(async () => {
    try {
      // Commit any remaining transcript before disconnecting
      scribe.commit();
      // Small delay to allow final commit to process
      await new Promise(resolve => setTimeout(resolve, 500));
      scribe.disconnect();
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  }, [scribe]);

  const getFullTranscript = useCallback(() => {
    return transcripts
      .map((t) => {
        const mins = Math.floor(t.timestamp / 60000);
        const secs = Math.floor((t.timestamp % 60000) / 1000);
        const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        return `[${timeStr}] ${t.speaker}: ${t.text}`;
      })
      .join("\n");
  }, [transcripts]);

  return {
    isConnecting,
    isConnected: scribe.isConnected,
    transcripts,
    partialText: scribe.partialTranscript || "",
    speakersDetected,
    error,
    startRecording,
    stopRecording,
    getFullTranscript,
  };
}
