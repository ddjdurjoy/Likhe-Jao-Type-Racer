import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.png",
        "offline.html",
        "icons/*.png",
        "splash/*.png",
        // SVG logos are used in-app
        "Logo For Bengali - Classic Mode.svg",
        "Logo For Bengali - Dark Mode.svg",
        "Logo For Bengali - Neon Racer.svg",
        "Logo For Bengali - Sunset Drive.svg",
        "Logo For English - Classic Mode.svg",
        "Logo For English - Dark Mode.svg",
        "Logo For English - Neon Racer.svg",
        "Logo For English - Sunset Drive.svg",
      ],
      manifest: {
        name: "Likhe Jao - Typing Race",
        short_name: "Likhe Jao",
        description: "Competitive typing racing game",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#4F46E5",
        background_color: "#ffffff",
        icons: [
          {
            src: "/icons/icon-72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "/icons/icon-96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "/icons/icon-128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "/icons/icon-144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "/icons/icon-152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/offline.html",
        runtimeCaching: [
          // Network-first for API calls
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache-first for static assets
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "image" ||
              request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "asset-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: process.env.NODE_ENV !== "production",
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
