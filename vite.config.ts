import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "PayFlow",
        short_name: "PayFlow",
        description: "Queue Management System",
        theme_color: "#f97316",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/PayFlow-Logo_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/PayFlow-Logo_500.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        screenshots: [
          {
            src: "/screenshot1.jpg",
            sizes: "1080x2481",
            type: "image/jpeg",
            form_factor: "narrow",
          },
        ],
      },
    }),
  ],
  css: {
    devSourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});