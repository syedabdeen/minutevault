import { useState, useCallback, useRef } from "react";
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
  const speakerCountRef = useRef<Set<string>>(new Set());
  const transcriptIdCounter = useRef(0);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      console.log("Partial transcript:", data.text);
    },
    onCommittedTranscript: (data) => {
      console.log("Committed transcript:", data.text);
      if (data.text) {
        const timestamp = Date.now() - startTimeRef.current;
        const speakerNum = speakerCountRef.current.size + 1;
        const speakerLabel = `Speaker ${speakerNum}`;
        
        speakerCountRef.current.add(speakerLabel);
        setSpeakersDetected(speakerCountRef.current.size);

        transcriptIdCounter.current += 1;
        setTranscripts((prev) => [
          ...prev,
          {
            id: `transcript-${transcriptIdCounter.current}`,
            text: data.text,
            timestamp,
            speaker: speakerLabel,
          },
        ]);
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
    speakerCountRef.current = new Set();
    setTranscripts([]);
    setSpeakersDetected(0);

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
