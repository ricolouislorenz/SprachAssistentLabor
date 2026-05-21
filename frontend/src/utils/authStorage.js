const KEY = "laborassistent.sessionToken.v1";
const LEGACY_PASSWORD_KEY = "laborassistent.appPassword.v1";

export function readToken() {
  try {
    return window.localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function writeToken(value) {
  try {
    if (value) {
      window.localStorage.setItem(KEY, value);
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // Storage nicht verfügbar (private Mode) — ignorieren
  }
}

export function clearToken() {
  writeToken("");
}

// Einmalige Aufräumaktion: alte Passwort-Storage-Einträge aus früheren
// Versionen entfernen, in denen das Passwort direkt im LocalStorage lag.
export function clearLegacyPassword() {
  try {
    window.localStorage.removeItem(LEGACY_PASSWORD_KEY);
  } catch {
    // ignorieren
  }
}
