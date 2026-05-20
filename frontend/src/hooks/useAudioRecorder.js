import { useCallback, useEffect, useRef, useState } from "react";

function pickSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];

  if (typeof MediaRecorder === "undefined") return "";

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionFor(mimeType) {
  if (mimeType.startsWith("audio/webm")) return "webm";
  if (mimeType.startsWith("audio/ogg")) return "ogg";
  if (mimeType.startsWith("audio/mp4")) return "mp4";
  return "webm";
}

// MediaRecorder kapseln. Wichtig: Blob wird in einer ref gehalten, damit ein
// direkt nach stop() folgender Transkriptionsaufruf nicht in das React-State-
// Update-Race-Condition läuft.
export function useAudioRecorder({ onError } = {}) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioBlobRef = useRef(null);
  const stopResolversRef = useRef([]);
  const mimeTypeRef = useRef("");

  const [recording, setRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const usedType = mediaRecorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: usedType });
        audioBlobRef.current = blob;
        setHasAudio(blob.size > 0);
        cleanupStream();

        const resolvers = stopResolversRef.current;
        stopResolversRef.current = [];
        for (const resolve of resolvers) resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        if (onError) onError(event.error || new Error("MediaRecorder Fehler"));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setRecording(true);
    } catch (error) {
      cleanupStream();
      if (onError) onError(error);
      throw error;
    }
  }, [cleanupStream, onError]);

  // Promise-basiertes stop: kein setTimeout-Workaround mehr nötig.
  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(audioBlobRef.current);
    }

    return new Promise((resolve) => {
      stopResolversRef.current.push(resolve);
      try {
        recorder.stop();
      } catch (error) {
        stopResolversRef.current = stopResolversRef.current.filter((r) => r !== resolve);
        if (onError) onError(error);
        resolve(audioBlobRef.current);
      }
      setRecording(false);
    });
  }, [onError]);

  const clearAudio = useCallback(() => {
    audioBlobRef.current = null;
    chunksRef.current = [];
    setHasAudio(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const getAudioBlob = useCallback(() => audioBlobRef.current, []);

  const getFileExtension = useCallback(
    () => extensionFor(audioBlobRef.current?.type || mimeTypeRef.current || ""),
    []
  );

  return {
    recording,
    hasAudio,
    startRecording,
    stopRecording,
    clearAudio,
    getAudioBlob,
    getFileExtension
  };
}
