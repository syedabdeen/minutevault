import { useState, useCallback, useRef } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number; // milliseconds since recording start
  speaker: string;
}

export function useAudioRecording() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [speakersDetected, setSpeakersDetected] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(0);
  const transcriptCounterRef = useRef(0);
  const transcriptsRef = useRef<TranscriptSegment[]>([]);

  const appendTranscript = useCallback((text: string) => {
    transcriptCounterRef.current += 1;

    const timestamp = Date.now() - startTimeRef.current;
    const speakerLabel = `Speaker ${((transcriptCounterRef.current - 1) % 4) + 1}`;

    const next: TranscriptSegment = {
      id: `transcript-${transcriptCounterRef.current}-${Date.now()}`,
      text,
      timestamp,
      speaker: speakerLabel,
    };

    const updated = [...transcriptsRef.current, next];
    transcriptsRef.current = updated;
    setTranscripts(updated);
    setSpeakersDetected((prev) =>
      Math.max(prev, ((transcriptCounterRef.current - 1) % 4) + 1)
    );
  }, []);

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
      const text = data.text?.trim();
      if (text) appendTranscript(text);
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
    transcriptsRef.current = [];
    setTranscripts([]);
    setSpeakersDetected(0);
    scribe.clearTranscripts();

    try {
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
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to start recording. Please try again.";
      setError(errorMessage);
      setIsConnecting(false);
      return false;
    }
  }, [scribe]);

  const stopRecording = useCallback(async () => {
    try {
      // Flush any pending audio -> transcript before disconnecting.
      const beforeLen = transcriptsRef.current.length;

      await Promise.resolve(scribe.commit());

      const waitStartedAt = Date.now();
      while (
        Date.now() - waitStartedAt < 1500 &&
        transcriptsRef.current.length === beforeLen
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await Promise.resolve(scribe.disconnect());
    } catch (err) {
      console.error("Error stopping recording:", err);
    }

    return transcriptsRef.current;
  }, [scribe]);

  const getFullTranscript = useCallback(() => {
    return transcripts
      .map((t) => {
        const mins = Math.floor(t.timestamp / 60000);
        const secs = Math.floor((t.timestamp % 60000) / 1000);
        const timeStr = `${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
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

