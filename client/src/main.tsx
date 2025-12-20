import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA service worker registration + update notifications
import { toast } from "@/hooks/use-toast";
import { setupPWA } from "@/lib/pwa";

setupPWA({
  onOfflineReady: () => {
    toast({ title: "Ready to use offline", description: "Some features require internet connection." });
  },
  onNeedRefresh: (update) => {
    toast({
      title: "Update available",
      description: "A new version is ready. Refresh to update.",
      action: {
        label: "Update",
        onClick: update,
      } as any,
    });
  },
});
