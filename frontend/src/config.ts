declare global {
  interface Window {
    __CONFIG__?: { API_URL?: string };
  }
}

const fromRuntime = window.__CONFIG__?.API_URL?.trim();
const fromBuild = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

/** Backend base URL: runtime config.js first, then VITE_API_URL, then the default. No trailing slash. */
export const API_URL = (fromRuntime || fromBuild || "http://localhost:8080").replace(/\/+$/, "");
