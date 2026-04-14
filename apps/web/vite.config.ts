import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || "http://localhost:8080";
  const wsProxyTarget =
    env.VITE_WS_PROXY_TARGET ||
    env.VITE_WS_BASE_URL ||
    apiProxyTarget.replace(/^http/i, "ws");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true
        },
        "/healthz": {
          target: apiProxyTarget,
          changeOrigin: true
        },
        "/ws": {
          target: wsProxyTarget,
          changeOrigin: true,
          ws: true
        }
      }
    }
  };
});
