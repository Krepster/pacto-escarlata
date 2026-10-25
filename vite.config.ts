import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // En desarrollo, Vite sirve los datos de talentos directamente desde
      // TalentsForever, sin depender de la función de Cloudflare Pages.
      "/api/talents-data": {
        target: "https://talentsforever.com",
        changeOrigin: true,
        secure: true,
        rewrite: () => "/data.json",
      },
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});