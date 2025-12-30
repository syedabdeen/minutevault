import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
}

export function useAudioRecording() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [partialText, setPartialText] = useState("");
  const [speakersDetected, setSpeakersDetected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const speakerCountRef = useRef<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestMicrophonePermission = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });
      return stream;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setError("Microphone access denied. Please enable microphone permissions in your browser settings.");
      return null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Request microphone permission first
      const stream = await requestMicrophonePermission();
      if (!stream) {
        setIsConnecting(false);
        return false;
      }
      streamRef.current = stream;

      // Get token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke(
        "elevenlabs-scribe-token"
      );

      if (tokenError || !data?.token) {
        console.error("Failed to get scribe token:", tokenError);
        setError("Failed to initialize transcription service. Please try again.");
        stream.getTracks().forEach(track => track.stop());
        setIsConnecting(false);
        return false;
      }

      console.log("Got scribe token, connecting to WebSocket...");

      // Connect to ElevenLabs WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&token=${data.token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to ElevenLabs");
        startTimeRef.current = Date.now();
        speakerCountRef.current = new Set();
        setTranscripts([]);
        setSpeakersDetected(0);
        setIsConnected(true);
        setIsConnecting(false);

        // Start recording audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const arrayBuffer = await event.data.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ""
              )
            );
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };

        mediaRecorder.start(250); // Send audio chunks every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Received message:", message);

          // Handle partial transcripts
          if (message.type === "partial_transcript" && message.text) {
            setPartialText(message.text);
          }

          // Handle committed/final transcripts
          if ((message.type === "committed_transcript" || message.type === "final_transcript") && message.text) {
            const timestamp = Date.now() - startTimeRef.current;
            const speakerLabel = message.speaker || `Speaker ${(speakerCountRef.current.size % 4) + 1}`;
            
            speakerCountRef.current.add(speakerLabel);
            setSpeakersDetected(speakerCountRef.current.size);

            setTranscripts((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                text: message.text,
                timestamp,
                speaker: speakerLabel,
              },
            ]);
            setPartialText("");
          }

          // Handle session started
          if (message.type === "session_started") {
            console.log("ElevenLabs session started successfully");
          }

          // Handle errors from ElevenLabs
          if (message.type === "error") {
            console.error("ElevenLabs error:", message);
            setError(message.message || "Transcription error occurred");
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error. Please try again.");
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      };

      return true;
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please try again.");
      setIsConnecting(false);
      return false;
    }
  }, [requestMicrophonePermission]);

  const stopRecording = useCallback(async () => {
    try {
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      // Close WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsConnected(false);
      setPartialText("");
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  }, []);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isConnecting,
    isConnected,
    transcripts,
    partialText,
    speakersDetected,
    error,
    startRecording,
    stopRecording,
    getFullTranscript,
  };
}
