import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGameStore, CARS } from "@/lib/stores/gameStore";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LanguageSelector } from "@/components/ui/LanguageToggle";
import { CarPreview } from "@/components/game/Car";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Users, Trophy, Zap, Target, Wifi } from "lucide-react";
import type { Difficulty, Language } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();

  // Guest mode: backend always returns a session user.
  useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  
  const {
    username,
    setUsername,
    language,
    setLanguage,
    difficulty,
    setDifficulty,
    selectedCarId,
    setSelectedCarId,
    totalRaces,
    totalWins,
    bestWpm,
    avgWpm,
    unlockedCars,
  } = useGameStore();

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showRaceDialog, setShowRaceDialog] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string>("__race_mode_picker__");
  const [tempUsername, setTempUsername] = useState(username);

  const openRaceDialog = () => {
    setShowRaceDialog(true);
  };

  const handleConfirmStart = () => {
    if (!tempUsername.trim()) return;
    setUsername(tempUsername.trim());
    setShowStartDialog(false);

    // Special case: after entering name, open the race mode picker.
    if (pendingDestination === "__race_mode_picker__") {
      openRaceDialog();
      return;
    }

    setLocation(pendingDestination);
  };

  const handlePractice = () => {
    setLocation("/practice");
  };

  const handleLeaderboard = () => {
    setLocation("/leaderboard");
  };

  const handleGarage = () => {
    setLocation("/garage");
  };

  const startRaceFlow = useCallback(() => {
    // If username is missing, we will prompt first, then continue to the mode picker.
    if (!username) {
      setPendingDestination("__race_mode_picker__");
      setShowStartDialog(true);
      return;
    }
    openRaceDialog();
  }, [openRaceDialog, username]);

  // If navigated with ?start=race, open the race flow automatically.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("start") === "race") {
      // Clear query to avoid reopening on back/refresh.
      window.history.replaceState({}, "", "/");
      setTimeout(() => startRaceFlow(), 0);
    }
  }, [startRaceFlow]);

  const handleStartRace = () => startRaceFlow();

  const startVsBots = () => {
    // Ensure name exists first
    if (!username) {
      setPendingDestination("/bot-race");
      setShowStartDialog(true);
      return;
    }
    setShowRaceDialog(false);
    setLocation("/bot-race");
  };

  const startVsFriend = () => {
    if (!username) {
      setPendingDestination("/local-race");
      setShowStartDialog(true);
      return;
    }
    setShowRaceDialog(false);
    setLocation("/local-race");
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 gap-6 sm:gap-8">
        <div className="text-center space-y-3 sm:space-y-4 max-w-lg px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold animated-heading">
            {language === "bn" ? "লিখে যাও" : "Type to Win"}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {language === "bn"
              ? "দ্রুত টাইপ করুন, রেসে জিতুন!"
              : "Race against AI or friends. Type fast, win races!"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl px-2">
          <Button
            size="lg"
            className="h-16 sm:h-20 text-base sm:text-lg font-semibold gap-2 sm:gap-3"
            onClick={handleStartRace}
            data-testid="button-start-race"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6" />
            {language === "bn" ? "রেস শুরু করুন" : "Start Race"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-16 sm:h-20 text-base sm:text-lg font-semibold gap-2 sm:gap-3"
            onClick={handlePractice}
            data-testid="button-practice"
          >
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            {language === "bn" ? "অনুশীলন" : "Practice Mode"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-16 sm:h-20 text-base sm:text-lg font-semibold gap-2 sm:gap-3"
            onClick={handleGarage}
            data-testid="button-garage"
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
            {language === "bn" ? "গ্যারেজ" : "Garage"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-16 sm:h-20 text-base sm:text-lg font-semibold gap-2 sm:gap-3"
            onClick={handleLeaderboard}
            data-testid="button-leaderboard"
          >
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            {language === "bn" ? "লিডারবোর্ড" : "Leaderboard"}
          </Button>
        </div>

        {totalRaces > 0 && (
          <div className="w-full max-w-2xl p-4 sm:p-6 bg-transparent border border-card-border rounded-lg">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {language === "bn" ? `${username || "আপনি"} এর পরিসংখ্যান` : `Stats of ${username || "Guest"}` }
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-primary">{totalRaces}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {language === "bn" ? "রেস" : "Races"}
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-success">{totalWins}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {language === "bn" ? "জয়" : "Wins"}
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold">{Math.round(bestWpm)}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {language === "bn" ? "সেরা WPM" : "Best WPM"}
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold">{Math.round(avgWpm)}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {language === "bn" ? "গড় WPM" : "Avg WPM"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 sm:gap-4 opacity-60">
          <CarPreview carId={selectedCarId} size="sm" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            {CARS[selectedCarId]?.name || "Your Car"}
          </span>
        </div>
      </main>

      <footer className="relative z-10 p-3 sm:p-4 pb-safe text-center text-xs sm:text-sm text-muted-foreground border-t border-border">
        <span>© 2026 </span>
        <a href="https://www.youtube.com/@ddjDurjoy" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
          Durjoy Sir
        </a>
        <span> | All rights reserved.</span>
      </footer>

      <Dialog open={showRaceDialog} onOpenChange={setShowRaceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "bn" ? "রেস মোড নির্বাচন করুন" : "Choose Race Mode"}
            </DialogTitle>
            <DialogDescription>
              {language === "bn" ? "পাবলিক ম্যাচ বা প্রাইভেট রুম নির্বাচন করুন" : "Select Public Match or Private Room"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 mt-4">
            <Button className="h-12 text-base font-semibold gap-2" onClick={startVsBots}>
              <Zap className="w-5 h-5" />
              {language === "bn" ? "কম্পিউটারের সাথে খেলুন" : "Play with computer"}
            </Button>
            <Button variant="outline" className="h-12 text-base font-semibold gap-2" onClick={startVsFriend}>
              <Wifi className="w-5 h-5" />
              {language === "bn" ? "বন্ধুর সাথে খেলুন" : "Play with friend"}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "bn" ? "আপনার নাম দিন" : "Enter Your Name"}
            </DialogTitle>
            <DialogDescription>
              {language === "bn"
                ? "রেসে আপনার নাম দেখা যাবে"
                : "Your name will be displayed during races"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Input
              placeholder={language === "bn" ? "নাম লিখুন..." : "Enter your name..."}
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              className="h-12 text-lg"
              data-testid="input-username"
              maxLength={20}
            />

            <LanguageSelector value={language} onChange={setLanguage} />

            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <SelectTrigger data-testid="select-difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">
                  {language === "bn" ? "সহজ" : "Easy"}
                </SelectItem>
                <SelectItem value="medium">
                  {language === "bn" ? "মাঝারি" : "Medium"}
                </SelectItem>
                <SelectItem value="hard">
                  {language === "bn" ? "কঠিন" : "Hard"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={handleConfirmStart}
              disabled={!tempUsername.trim()}
              data-testid="button-confirm-start"
            >
              <Play className="w-5 h-5 mr-2" />
              {language === "bn" ? "শুরু করুন" : "Start Racing"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
