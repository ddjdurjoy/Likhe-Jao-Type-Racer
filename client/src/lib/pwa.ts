import { registerSW } from "virtual:pwa-register";

/**
 * Registers the service worker and wires update notifications.
 *
 * We use registerType: "prompt" so updates are applied when user accepts.
 */
export function setupPWA({
  onNeedRefresh,
  onOfflineReady,
}: {
  onNeedRefresh?: (update: () => void) => void;
  onOfflineReady?: () => void;
} = {}) {
  // In dev, the plugin may be enabled. Safe to call regardless.
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh?.(() => updateSW(true));
    },
    onOfflineReady() {
      onOfflineReady?.();
    },
  });
}
