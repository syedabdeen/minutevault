import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import icon192 from "./src/assets/icon-192.png.asset.json";
import icon512 from "./src/assets/icon-512.png.asset.json";
import appleIcon from "./src/assets/apple-touch-icon.png.asset.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "favicon.ico"],
      manifest: {
        name: "MinuteVault - Secure Meeting Minutes",
        short_name: "MinuteVault",
        description: "AI-powered meeting recording and transcription for professional Minutes of Meeting documents",
        theme_color: "#0B3C5D",
        background_color: "#0B3C5D",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: icon192.url,
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: icon512.url,
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: appleIcon.url,
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
