import axios from "axios";
import { clearAuthToken, getAuthToken } from "./auth";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      // A 401 means the session token is dead (expired/revoked): purge it so
      // the app falls back to the login screen instead of retrying with it.
      if (error.response?.status === 401) {
        clearAuthToken();
      }
      const message = (error.response?.data as { message?: string } | undefined)?.message;
      throw new Error(message ?? error.message);
    }
    throw error;
  },
);
