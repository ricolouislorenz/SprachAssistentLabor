import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { HeroStatus } from "./components/HeroStatus";
import { CommandPanel } from "./components/CommandPanel";
import { RecordingPanel } from "./components/RecordingPanel";
import { ProtocolForm } from "./components/ProtocolForm";
import { PrintReport } from "./components/PrintReport";
import { PasswordGate } from "./components/PasswordGate";
import { useAudioRecorder } from "./hooks/useAudioRecorder";
import { useVoiceCommands } from "./hooks/useVoiceCommands";
import { useProtocolApi } from "./hooks/useProtocolApi";
import { initialProtocol } from "./utils/initialProtocol";
import { COMMANDS, COMMAND_LABELS } from "./utils/commandParser";
import { readPassword, writePassword, clearPassword } from "./utils/authStorage";
import "./App.css";

function generateReportNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `LB-${yyyy}${mm}${dd}-${seq}`;
}

function App() {
  const [transcript, setTranscript] = useState("");
  const [protocol, setProtocol] = useState(initialProtocol);
  const [reportNumber, setReportNumber] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [notice, setNotice] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [authRequired, setAuthRequired] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [lastCommandLabel, setLastCommandLabel] = useState("");

  const transcriptRef = useRef("");
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const showError = useCallback((message) => {
    setNotice({ type: "error", message: String(message) });
  }, []);

  const showInfo = useCallback((message) => {
    setNotice({ type: "info", message });
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearPassword();
    setAuthenticated(false);
    showError("Sitzung abgelaufen — bitte erneut anmelden.");
  }, [showError]);

  const applyStructuredProtocol = useCallback((structured) => {
    setProtocol({ ...initialProtocol, ...structured });
    setReportNumber(generateReportNumber());
    setGeneratedAt(new Date());
  }, []);

  const {
    recording,
    hasAudio,
    startRecording,
    stopRecording,
    clearAudio,
    getAudioBlob,
    getFileExtension
  } = useAudioRecorder({ onError: showError });

  const {
    transcribing,
    structuring,
    transcribeAudio,
    structureTranscript,
    checkHealth,
    verifyPassword
  } = useProtocolApi({ onUnauthorized: handleUnauthorized });

  // Backend-Health beim Start prüfen.
  useEffect(() => {
    let cancelled = false;
    checkHealth().then((result) => {
      if (cancelled) return;
      setBackendHealthy(Boolean(result?.ok));
      const required = Boolean(result?.authRequired);
      setAuthRequired(required);

      if (!required) {
        setAuthenticated(true);
        return;
      }

      const stored = readPassword();
      if (!stored) return;

      verifyPassword(stored).then((ok) => {
        if (cancelled) return;
        if (ok) {
          setAuthenticated(true);
        } else {
          clearPassword();
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [checkHealth, verifyPassword]);

  const handleUnlock = useCallback((password) => {
    writePassword(password);
    setAuthenticated(true);
    showInfo("Erfolgreich angemeldet.");
  }, [showInfo]);

  const handleSignOut = useCallback(() => {
    clearPassword();
    setAuthenticated(false);
    showInfo("Abgemeldet.");
  }, [showInfo]);

  const appendLiveTranscript = useCallback((chunk) => {
    if (!chunk) return;
    setTranscript((prev) => {
      const sep = prev && !prev.endsWith(" ") ? " " : "";
      return prev + sep + chunk.trim() + " ";
    });
  }, []);

  const handleStartRecordingRef = useRef(null);
  const handleStopRecordingRef = useRef(null);
  const handleBuildProtocolRef = useRef(null);
  const handleResetRef = useRef(null);

  const handleCommand = useCallback((command) => {
    setLastCommandLabel(COMMAND_LABELS[command] || command);

    if (command === COMMANDS.ACTIVATE || command === COMMANDS.RESUME) {
      handleStartRecordingRef.current?.();
      return;
    }
    if (command === COMMANDS.DEACTIVATE) {
      handleStopRecordingRef.current?.();
      return;
    }
    if (command === COMMANDS.BUILD_PROTOCOL) {
      handleBuildProtocolRef.current?.();
      return;
    }
    if (command === COMMANDS.RESET) {
      handleResetRef.current?.();
    }
  }, []);

  const {
    supported: voiceSupported,
    listening,
    lastUtterance,
    startListening,
    stopListening,
    setCapturing
  } = useVoiceCommands({
    onCommand: handleCommand,
    onLiveTranscriptChunk: appendLiveTranscript,
    onError: showError
  });

  const handleStartRecording = useCallback(async () => {
    setNotice(null);
    try {
      await startRecording();
      setCapturing(true);
      showInfo("Aufnahme läuft — diktiere jetzt deine Beobachtung.");
    } catch (error) {
      showError(
        error?.message
          ? `Mikrofon konnte nicht gestartet werden: ${error.message}`
          : "Mikrofon konnte nicht gestartet werden."
      );
    }
  }, [setCapturing, showError, showInfo, startRecording]);

  const handleStopRecording = useCallback(async () => {
    setCapturing(false);
    const blob = await stopRecording();
    if (!blob || blob.size === 0) {
      showError(
        "Aufnahme wurde gestoppt, enthält aber keine Audiodaten. Bitte erneut versuchen."
      );
      return null;
    }
    showInfo(
      `Aufnahme bereit (${(blob.size / 1024).toFixed(1)} kB). Sage „Konrad, Protokoll erstellen" oder klicke „Transkribieren".`
    );
    return blob;
  }, [setCapturing, showError, showInfo, stopRecording]);

  const transcribeAndStructure = useCallback(
    async (blob) => {
      try {
        const whisperText = await transcribeAudio(blob, getFileExtension());
        if (whisperText && whisperText.trim()) {
          setTranscript(whisperText.trim());
        }
        const textForStructuring = whisperText?.trim() || transcriptRef.current;
        if (!textForStructuring) {
          showError("Kein Transkript zum Strukturieren vorhanden.");
          return;
        }
        const structured = await structureTranscript(textForStructuring);
        applyStructuredProtocol(structured);
        showInfo("Protokoll erfolgreich erstellt. Bitte Inhalte prüfen.");
      } catch (error) {
        showError(error?.message || "Verarbeitung fehlgeschlagen.");
      }
    },
    [applyStructuredProtocol, getFileExtension, showError, showInfo, structureTranscript, transcribeAudio]
  );

  const handleBuildProtocol = useCallback(async () => {
    if (recording) {
      const blob = await handleStopRecording();
      if (!blob) return;
      await transcribeAndStructure(blob);
      return;
    }

    const blob = getAudioBlob();
    if (blob && blob.size > 0) {
      await transcribeAndStructure(blob);
      return;
    }

    const text = transcriptRef.current.trim();
    if (!text) {
      showError("Es liegt weder eine Aufnahme noch ein Transkript vor.");
      return;
    }
    try {
      const structured = await structureTranscript(text);
      applyStructuredProtocol(structured);
      showInfo("Protokoll aus vorhandenem Transkript erstellt.");
    } catch (error) {
      showError(error?.message || "Strukturierung fehlgeschlagen.");
    }
  }, [
    applyStructuredProtocol,
    getAudioBlob,
    handleStopRecording,
    recording,
    showError,
    showInfo,
    structureTranscript,
    transcribeAndStructure
  ]);

  const handleReset = useCallback(async () => {
    setCapturing(false);
    if (recording) {
      try {
        await stopRecording();
      } catch {
        // ignorieren — wir setzen ohnehin alles zurück
      }
    }
    clearAudio();
    setTranscript("");
    setProtocol(initialProtocol);
    setReportNumber("");
    setGeneratedAt(null);
    setLastCommandLabel("");
    showInfo("Sitzung zurückgesetzt.");
  }, [clearAudio, recording, setCapturing, showInfo, stopRecording]);

  useEffect(() => {
    handleStartRecordingRef.current = handleStartRecording;
    handleStopRecordingRef.current = handleStopRecording;
    handleBuildProtocolRef.current = handleBuildProtocol;
    handleResetRef.current = handleReset;
  }, [handleStartRecording, handleStopRecording, handleBuildProtocol, handleReset]);

  const handleRestructure = useCallback(async () => {
    const text = transcriptRef.current.trim();
    if (!text) {
      showError("Kein Transkript vorhanden.");
      return;
    }
    try {
      const structured = await structureTranscript(text);
      applyStructuredProtocol(structured);
      showInfo("Protokoll erneut befüllt.");
    } catch (error) {
      showError(error?.message || "Strukturierung fehlgeschlagen.");
    }
  }, [applyStructuredProtocol, showError, showInfo, structureTranscript]);

  const handleManualTranscribe = useCallback(async () => {
    const blob = getAudioBlob();
    if (!blob || blob.size === 0) {
      showError("Keine Aufnahme vorhanden.");
      return;
    }
    await transcribeAndStructure(blob);
  }, [getAudioBlob, showError, transcribeAndStructure]);

  const handleFieldChange = useCallback((field, value) => {
    setProtocol((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMeasurementsChange = useCallback((messwerte) => {
    setProtocol((prev) => ({ ...prev, messwerte }));
  }, []);

  // Auth-Gate vorgeschaltet: keine App-Funktion ist erreichbar, bevor das
  // Passwort verifiziert wurde.
  if (authRequired && !authenticated) {
    return (
      <PasswordGate
        onUnlock={handleUnlock}
        verifyPassword={verifyPassword}
      />
    );
  }

  return (
    <div className="app">
      <TopBar
        listening={listening}
        recording={recording}
        transcribing={transcribing}
        structuring={structuring}
        backendHealthy={backendHealthy}
        authEnabled={authRequired}
        onSignOut={authRequired ? handleSignOut : null}
      />

      {notice && (
        <div className={`notice-banner notice-${notice.type} no-print`}>
          <span>{notice.message}</span>
          <button
            type="button"
            className="icon-only ghost"
            onClick={() => setNotice(null)}
            aria-label="Hinweis schließen"
          >
            ×
          </button>
        </div>
      )}

      <HeroStatus
        supported={voiceSupported}
        listening={listening}
        recording={recording}
        transcribing={transcribing}
        structuring={structuring}
        reportNumber={reportNumber}
        onStart={startListening}
        onStop={stopListening}
      />

      <div className="grid-two no-print">
        <CommandPanel
          supported={voiceSupported}
          lastUtterance={lastUtterance}
          lastCommandLabel={lastCommandLabel}
        />

        <RecordingPanel
          recording={recording}
          hasAudio={hasAudio}
          transcript={transcript}
          transcribing={transcribing}
          structuring={structuring}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onTranscribeAndStructure={handleManualTranscribe}
          onRestructure={handleRestructure}
          onReset={handleReset}
          onPrint={() => window.print()}
          onTranscriptChange={setTranscript}
        />
      </div>

      <div className="screen-only">
        <ProtocolForm
          protocol={protocol}
          onFieldChange={handleFieldChange}
          onMeasurementsChange={handleMeasurementsChange}
        />
      </div>

      <PrintReport
        protocol={protocol}
        reportNumber={reportNumber}
        generatedAt={generatedAt}
      />
    </div>
  );
}

export default App;
