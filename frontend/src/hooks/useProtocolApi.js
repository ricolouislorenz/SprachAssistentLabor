import { useCallback, useState } from "react";
import { readToken } from "../utils/authStorage";

const DEFAULT_BACKEND =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function authHeaders() {
  const token = readToken();
  return token ? { "X-Session-Token": token } : {};
}

async function parseJsonOrThrow(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Server hat kein JSON geliefert
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.details ||
      `HTTP ${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function useProtocolApi({ baseUrl = DEFAULT_BACKEND, onUnauthorized } = {}) {
  const [transcribing, setTranscribing] = useState(false);
  const [structuring, setStructuring] = useState(false);

  const handleUnauthorized = useCallback(
    (error) => {
      if (error?.status === 401) {
        onUnauthorized?.();
      }
    },
    [onUnauthorized]
  );

  const transcribeAudio = useCallback(
    async (audioBlob, fileExtension = "webm") => {
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error("Keine gültige Aufnahme vorhanden. Bitte erneut aufnehmen.");
      }

      setTranscribing(true);
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, `aufnahme.${fileExtension}`);

        const response = await fetch(`${baseUrl}/api/transcribe`, {
          method: "POST",
          headers: { ...authHeaders() },
          body: formData
        });

        const data = await parseJsonOrThrow(response);
        return data?.text || "";
      } catch (error) {
        handleUnauthorized(error);
        throw error;
      } finally {
        setTranscribing(false);
      }
    },
    [baseUrl, handleUnauthorized]
  );

  const structureTranscript = useCallback(
    async (transcript) => {
      if (!transcript || !transcript.trim()) {
        throw new Error("Kein Transkript vorhanden.");
      }

      setStructuring(true);
      try {
        const response = await fetch(`${baseUrl}/api/structure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders()
          },
          body: JSON.stringify({ transcript })
        });

        return await parseJsonOrThrow(response);
      } catch (error) {
        handleUnauthorized(error);
        throw error;
      } finally {
        setStructuring(false);
      }
    },
    [baseUrl, handleUnauthorized]
  );

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (!response.ok) return { ok: false };
      return await response.json();
    } catch {
      return { ok: false };
    }
  }, [baseUrl]);

  const login = useCallback(
    async (password) => {
      try {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        });
        if (!response.ok) return { ok: false, token: "" };
        const data = await response.json().catch(() => ({}));
        return { ok: true, token: data?.token || "" };
      } catch {
        return { ok: false, token: "" };
      }
    },
    [baseUrl]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { ...authHeaders() }
      });
    } catch {
      // Netzwerk weg — lokal trotzdem abmelden
    }
  }, [baseUrl]);

  const verifySession = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/api/auth/verify`, {
        method: "GET",
        headers: { ...authHeaders() }
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [baseUrl]);

  return {
    transcribing,
    structuring,
    transcribeAudio,
    structureTranscript,
    checkHealth,
    login,
    logout,
    verifySession
  };
}
