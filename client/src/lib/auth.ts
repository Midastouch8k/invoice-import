import { authTokenStorageKey } from "../constants";

/**
 * localStorage can be unavailable (sandboxed tests, opaque origins, privacy
 * modes). Fall back to in-memory storage so auth still works for the session.
 */
const memoryStorage = new Map<string, string>();

function getStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  try {
    if (typeof localStorage !== "undefined") {
      // Probe it: node's stub may exist but be non-functional.
      const probeKey = "__probe__";
      localStorage.setItem(probeKey, "1");
      localStorage.removeItem(probeKey);
      return localStorage;
    }
  } catch {
    // fall through to memory storage
  }
  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
    },
  };
}

export function getAuthToken(): string | null {
  return getStorage().getItem(authTokenStorageKey);
}

export function setAuthToken(token: string): void {
  getStorage().setItem(authTokenStorageKey, token);
}

export function clearAuthToken(): void {
  getStorage().removeItem(authTokenStorageKey);
}
