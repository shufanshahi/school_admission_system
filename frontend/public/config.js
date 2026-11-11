// Runtime configuration, loaded before the app starts.
// In Docker, docker-entrypoint.sh regenerates this file from the API_URL environment variable,
// so the backend URL can change without rebuilding the image.
// Left empty here: the app then uses VITE_API_URL if set, otherwise http://localhost:8080.
window.__CONFIG__ = {};
