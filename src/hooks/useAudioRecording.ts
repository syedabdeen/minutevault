import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker: string;
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestMicrophonePermission = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
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

      // Connect to ElevenLabs WebSocket with VAD enabled
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&token=${data.token}&audio_format=pcm_16000&commit_strategy=vad`
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

        // Set up audio context for PCM conversion at 16kHz
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;
        
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert float32 to int16 PCM (little-endian)
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            // Convert to base64
            const uint8Array = new Uint8Array(pcmData.buffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            
            // Send in correct ElevenLabs format
            ws.send(JSON.stringify({ audio_base_64: base64 }));
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Received message:", message.message_type, message);

          // Handle partial transcripts
          if (message.message_type === "partial_transcript" && message.text) {
            setPartialText(message.text);
          }

          // Handle committed/final transcripts
          if (message.message_type === "committed_transcript" && message.text) {
            const timestamp = Date.now() - startTimeRef.current;
            const speakerNum = speakerCountRef.current.size + 1;
            const speakerLabel = `Speaker ${speakerNum}`;
            
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
          if (message.message_type === "session_started") {
            console.log("ElevenLabs session started successfully");
          }

          // Handle errors from ElevenLabs
          if (message.message_type === "error" || message.message_type === "input_error") {
            console.error("ElevenLabs error:", message);
            if (message.error) {
              setError(message.error);
            }
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
        cleanupAudio();
      };

      return true;
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please try again.");
      setIsConnecting(false);
      return false;
    }
  }, [requestMicrophonePermission]);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      // Close WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      cleanupAudio();
      setIsConnected(false);
      setPartialText("");
    } catch (err) {
      console.error("Error stopping recording:", err);
    }
  }, [cleanupAudio]);

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
      cleanupAudio();
    };
  }, [cleanupAudio]);

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
