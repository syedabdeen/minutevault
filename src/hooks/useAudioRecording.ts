import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number; // milliseconds since recording start
  speaker: string;
}

// Check if running in a Capacitor native environment
const isNativeApp = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.();
};

// Request microphone permission explicitly for native apps
const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    // For web/PWA, the browser handles this via getUserMedia
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      } 
    });
    
    // Stop the stream immediately - we just needed to trigger the permission
    stream.getTracks().forEach(track => track.stop());
    
    console.log("Microphone permission granted");
    return true;
  } catch (err) {
    console.error("Microphone permission denied:", err);
    return false;
  }
};

export function useAudioRecording() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [speakersDetected, setSpeakersDetected] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(0);
  const transcriptCounterRef = useRef(0);
  const transcriptsRef = useRef<TranscriptSegment[]>([]);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

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
      retryCountRef.current = 0; // Reset retry count on successful connection
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
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
        // Check for common WebSocket/connection errors that might occur on native
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes("websocket") || errorMsg.includes("connection")) {
          setError("Connection lost. Please try again.");
        } else if (errorMsg.includes("permission") || errorMsg.includes("microphone")) {
          setError("Microphone access denied. Please enable microphone permissions in your device settings.");
        } else {
          setError(err.message || "Transcription error occurred");
        }
      } else {
        setError("Transcription error occurred");
      }
    },
  });

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    // First, explicitly request microphone permission
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      setError("Microphone permission is required for recording. Please enable it in your device settings.");
      setIsConnecting(false);
      return false;
    }

    startTimeRef.current = Date.now();
    transcriptCounterRef.current = 0;
    transcriptsRef.current = [];
    setTranscripts([]);
    setSpeakersDetected(0);
    scribe.clearTranscripts();

    const attemptConnection = async (): Promise<boolean> => {
      try {
        console.log(`Attempting connection (attempt ${retryCountRef.current + 1}/${maxRetries + 1})...`);
        
        const { data, error: tokenError } = await supabase.functions.invoke(
          "elevenlabs-scribe-token"
        );

        if (tokenError || !data?.token) {
          console.error("Failed to get scribe token:", tokenError);
          throw new Error("Failed to initialize transcription service");
        }

        console.log("Got scribe token, connecting...");

        // Set a connection timeout for native apps
        const connectionPromise = scribe.connect({
          token: data.token,
          microphone: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Add timeout for connection (important for native apps)
        const timeoutPromise = new Promise<never>((_, reject) => {
          connectionTimeoutRef.current = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 15000); // 15 second timeout
        });

        await Promise.race([connectionPromise, timeoutPromise]);

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        return true;
      } catch (err: unknown) {
        console.error("Connection attempt failed:", err);
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          console.log(`Retrying... (${retryCountRef.current}/${maxRetries})`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
          return attemptConnection();
        }

        throw err;
      }
    };

    try {
      const success = await attemptConnection();
      setIsConnecting(false);
      return success;
    } catch (err: unknown) {
      console.error("Error starting recording:", err);
      
      let errorMessage = "Failed to start recording. Please try again.";
      
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes("timeout")) {
          errorMessage = "Connection timed out. Please check your internet connection and try again.";
        } else if (msg.includes("permission") || msg.includes("microphone")) {
          errorMessage = "Microphone access denied. Please enable microphone permissions.";
        } else if (msg.includes("network") || msg.includes("fetch")) {
          errorMessage = "Network error. Please check your internet connection.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setIsConnecting(false);
      return false;
    }
  }, [scribe]);

  const stopRecording = useCallback(async () => {
    try {
      // Clear any pending timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

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
