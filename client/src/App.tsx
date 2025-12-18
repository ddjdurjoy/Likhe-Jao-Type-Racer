import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import Home from "@/pages/Home";
import Race from "@/pages/Race";
import Practice from "@/pages/Practice";
import Garage from "@/pages/Garage";
import Leaderboard from "@/pages/Leaderboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/race" component={Race} />
      <Route path="/practice" component={Practice} />
      <Route path="/garage" component={Garage} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeInitializer() {
  const { theme } = useGameStore();

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }

    if (theme === "neon") {
      root.style.setProperty("--primary", "280 100% 60%");
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--ring", "280 100% 60%");
    } else if (theme === "sunset") {
      root.style.setProperty("--primary", "25 95% 53%");
      root.style.setProperty("--primary-foreground", "0 0% 100%");
      root.style.setProperty("--ring", "25 95% 53%");
    } else {
      root.style.setProperty("--primary", "217 91% 60%");
      root.style.setProperty("--primary-foreground", "0 0% 98%");
      root.style.setProperty("--ring", "217 91% 60%");
    }
  }, [theme]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInitializer />
        <Toaster />
        <div className="h-screen overflow-hidden flex flex-col">
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
