import { authTokenStorageKey } from "../constants";

export function getAuthToken(): string | null {
  return localStorage.getItem(authTokenStorageKey);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(authTokenStorageKey, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(authTokenStorageKey);
}
