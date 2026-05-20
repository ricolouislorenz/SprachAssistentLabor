const KEY = "laborassistent.appPassword.v1";

export function readPassword() {
  try {
    return window.localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function writePassword(value) {
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

export function clearPassword() {
  writePassword("");
}
