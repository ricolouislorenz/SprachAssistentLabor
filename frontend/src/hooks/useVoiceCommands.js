import { useCallback, useEffect, useRef, useState } from "react";
import { parseCommand, stripCommandPhrases } from "../utils/commandParser";

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Fehler, bei denen ein automatischer Neustart aussichtslos ist. Ohne diese
// Sperre alterniert der Hook im Sekundentakt zwischen "Bereit" und "Inaktiv"
// (typisches Edge-Symptom, wenn der MS-Speech-Endpoint nicht erreichbar ist).
const TERMINAL_SPEECH_ERRORS = new Set([
  "network",
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "language-not-supported"
]);

function speechErrorMessage(err) {
  switch (err) {
    case "network":
      return (
        "Spracherkennung-Fehler: Der Cloud-Dienst ist nicht erreichbar. " +
        "Unter Edge bitte prüfen, ob „Windows-Einstellungen → Datenschutz & Sicherheit → " +
        "Spracheingabe → Online-Spracherkennung“ aktiviert ist. " +
        "Auch Firewall, VPN, AdBlocker oder ein Unternehmens-Proxy können den " +
        "Microsoft-Speech-Endpoint blockieren. Alternativ in Chrome öffnen."
      );
    case "not-allowed":
    case "service-not-allowed":
      return "Spracherkennung-Fehler: Mikrofon-Berechtigung verweigert oder Dienst blockiert.";
    case "audio-capture":
      return "Spracherkennung-Fehler: Kein Mikrofon verfügbar.";
    case "language-not-supported":
      return "Spracherkennung-Fehler: Deutsch wird in diesem Browser nicht unterstützt.";
    default:
      return `Spracherkennung-Fehler: ${err}`;
  }
}

// Eine SpeechRecognition-Instanz erfüllt zwei Zwecke gleichzeitig:
// 1. Befehlserkennung (Wakeword "Konrad")
// 2. Live-Transkript-Anzeige (für den Hands-Free-Workflow)
//
// Während keine Aufnahme läuft, hört der Hook nur auf Befehle und verwirft den
// Resttext. Während eine Aufnahme läuft (capturingRef === true), werden alle
// finalen Erkennungsergebnisse in das Live-Transkript übernommen.
export function useVoiceCommands({
  onCommand,
  onLiveTranscriptChunk,
  onError
} = {}) {
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const capturingRef = useRef(false);
  const lastFiredCommandRef = useRef({ command: null, at: 0 });
  const restartTimerRef = useRef(null);
  const startListeningRef = useRef(null);

  const onCommandRef = useRef(onCommand);
  const onLiveTranscriptChunkRef = useRef(onLiveTranscriptChunk);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    onLiveTranscriptChunkRef.current = onLiveTranscriptChunk;
  }, [onLiveTranscriptChunk]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [lastUtterance, setLastUtterance] = useState("");
  const [supported] = useState(() => Boolean(getSpeechRecognitionCtor()));

  const fireCommand = useCallback((command) => {
    const now = Date.now();
    const last = lastFiredCommandRef.current;
    // Gleiches Kommando innerhalb von 2.5s nur einmal feuern (Interim+Final).
    if (last.command === command && now - last.at < 2500) return;
    lastFiredCommandRef.current = { command, at: now };
    onCommandRef.current?.(command);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.(
        new Error("SpeechRecognition wird in diesem Browser nicht unterstützt. Bitte Chrome oder Edge verwenden.")
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignorieren
      }
    }

    const recognition = new Ctor();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onerror = (event) => {
      // "no-speech" und "aborted" sind unkritisch — onend regelt den Restart.
      if (event.error === "no-speech" || event.error === "aborted") return;

      if (TERMINAL_SPEECH_ERRORS.has(event.error)) {
        // Restart-Schleife stoppen, damit der Status nicht im Sekundentakt
        // zwischen "Bereit" und "Inaktiv" alterniert.
        shouldListenRef.current = false;
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        try {
          recognition.stop();
        } catch {
          // ignorieren
        }
      }

      onErrorRef.current?.(new Error(speechErrorMessage(event.error)));
    };

    recognition.onend = () => {
      setListening(false);
      if (!shouldListenRef.current) return;

      // Direkten Neustart vermeiden — manche Browser werfen InvalidStateError.
      restartTimerRef.current = setTimeout(() => {
        if (!shouldListenRef.current) return;
        try {
          recognition.start();
        } catch {
          // Wenn das fehlschlägt, eine frische Instanz aufsetzen.
          startListeningRef.current?.();
        }
      }, 250);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let newFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          newFinal += text;
        } else {
          interim += text;
        }
      }

      setInterimText(interim);

      const combined = (newFinal + " " + interim).trim();
      if (combined) {
        setLastUtterance(combined);

        const command = parseCommand(combined);
        if (command) fireCommand(command);
      }

      if (newFinal && capturingRef.current) {
        const cleaned = stripCommandPhrases(newFinal);
        if (cleaned) onLiveTranscriptChunkRef.current?.(cleaned);
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    try {
      recognition.start();
    } catch (error) {
      onErrorRef.current?.(error);
    }
  }, [fireCommand]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    capturingRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignorieren
      }
    }
    setListening(false);
    setInterimText("");
  }, []);

  const setCapturing = useCallback((capture) => {
    capturingRef.current = Boolean(capture);
    if (!capture) setInterimText("");
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignorieren
        }
      }
    };
  }, []);

  return {
    supported,
    listening,
    interimText,
    lastUtterance,
    startListening,
    stopListening,
    setCapturing
  };
}
