import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { HeaderLogo } from "@/components/ui/HeaderLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { WeatherToggle } from "@/components/ui/WeatherToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SoundControls } from "@/components/ui/SoundControls";
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Auth from "@/pages/Auth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGameStore } from "@/lib/stores/gameStore";
import type { Difficulty } from "@shared/schema";
import { useState } from "react";

export function AppHeader() {
  const [, setLocation] = useLocation();
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  const { username, setUsername, language, setLanguage, difficulty, setDifficulty } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);


  const signout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/signout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4 sm:px-6">
        <div className="flex items-center gap-4">
          <HeaderLogo size={34} />
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link href="/" className="px-2 py-1 rounded hover:bg-muted">Home</Link>
            <Link href="/practice" className="px-2 py-1 rounded hover:bg-muted">Practice</Link>
            <Link href="/garage" className="px-2 py-1 rounded hover:bg-muted">Garage</Link>
            <Link href="/leaderboard" className="px-2 py-1 rounded hover:bg-muted">Leaderboard</Link>
            {me.data && (
              <>
                <Link href="/player" className="px-2 py-1 rounded hover:bg-muted">Player</Link>
                <Link href="/friends" className="px-2 py-1 rounded hover:bg-muted">Friends</Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <LanguageToggle />
          <div className="hidden sm:flex items-center gap-1 sm:gap-2">
            <SoundControls />
            <WeatherToggle />
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} aria-label="Settings">
            <Settings className="w-5 h-5" />
          </Button>
          {me.data ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/player">{me.data.username}</Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => signout.mutate()}
                disabled={signout.isPending}
              >
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setShowAuth(true)}>Sign in</Button>
          )}
        </div>
      </div>
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in / Sign up</DialogTitle>
          </DialogHeader>
          <Auth onAuthed={() => setShowAuth(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">Bengali</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
