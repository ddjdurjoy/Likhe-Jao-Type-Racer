import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSound } from "@/hooks/useSound";
import { CursorVelocityFX } from "@/components/ui/CursorVelocityFX";
import { AppHeader } from "@/components/ui/AppHeader";
import { GlobalBackground } from "@/components/ui/GlobalBackground";
import { useEffect } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import Home from "@/pages/Home";
import LocalRace from "@/pages/LocalRace";
import Practice from "@/pages/Practice";
import Garage from "@/pages/Garage";
import Leaderboard from "@/pages/Leaderboard";
import Auth from "@/pages/Auth";
import Player from "@/pages/Player";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/local-race" component={LocalRace} />
      <Route path="/practice" component={Practice} />
      <Route path="/garage" component={Garage} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/auth" component={Auth} />
      <Route path="/player" component={Player} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeInitializer() {
  const { theme } = useGameStore();

  useEffect(() => {
    const root = document.documentElement;

    // Add theme class for CSS variable scopes
    root.classList.remove("light", "dark", "neon", "sunset");
    root.classList.add(theme);

    // Manage tailwind dark mode class for non-light themes
    if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }

    if (theme === "neon") {
      root.style.setProperty("--primary", "262 83% 58%"); /* #7C3AED */
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--ring", "262 83% 58%");
    } else if (theme === "sunset") {
      root.style.setProperty("--primary", "20 90% 58%");
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--ring", "20 90% 58%");
    } else {
      root.style.setProperty("--primary", "183 100% 36%");
      root.style.setProperty("--primary-foreground", "0 0% 98%");
      root.style.setProperty("--ring", "183 100% 36%");
    }
  }, [theme]);

  return null;
}

function SoundInit() {
  // Mount global sound sync
  useSound();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInitializer />
        <SoundInit />
        <Toaster />
        <div className="min-h-screen overflow-x-hidden flex flex-col">
          <GlobalBackground />
          <CursorVelocityFX />
          <AppHeader />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
