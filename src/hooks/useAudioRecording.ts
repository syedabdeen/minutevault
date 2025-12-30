import { useState, useCallback, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
}

export function useAudioRecording() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [partialText, setPartialText] = useState("");
  const [speakersDetected, setSpeakersDetected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const speakerCountRef = useRef<Set<string>>(new Set());

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      setPartialText(data.text);
    },
    onCommittedTranscript: (data) => {
      const timestamp = Date.now() - startTimeRef.current;
      const speakerLabel = `Speaker ${(transcripts.length % 4) + 1}`;
      
      // Track unique speakers
      speakerCountRef.current.add(speakerLabel);
      setSpeakersDetected(speakerCountRef.current.size);

      setTranscripts((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: data.text,
          timestamp,
          speaker: speakerLabel,
        },
      ]);
      setPartialText("");
    },
  });

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just need permission
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setError("Microphone access denied. Please enable microphone permissions.");
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Request microphone permission first
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setIsConnecting(false);
        return false;
      }

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

      startTimeRef.current = Date.now();
      speakerCountRef.current = new Set();
      setTranscripts([]);
      setSpeakersDetected(0);

      // Start the transcription session
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
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please try again.");
      setIsConnecting(false);
      return false;
    }
  }, [scribe, requestMicrophonePermission]);

  const stopRecording = useCallback(async () => {
    try {
      await scribe.disconnect();
      setPartialText("");
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
    partialText,
    speakersDetected,
    error,
    startRecording,
    stopRecording,
    getFullTranscript,
  };
}
