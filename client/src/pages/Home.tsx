import { useState } from "react";
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
  const me = useQuery<any>({ queryKey: ["/api/auth/me"], retry: false });
  const isAuthed = !!me.data?.id;
  
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
  const [raceDialogStep, setRaceDialogStep] = useState<"root" | "private" | "join">("root");
  const [pendingDestination, setPendingDestination] = useState<string>("/race?mode=public");
  const [tempUsername, setTempUsername] = useState(username);
  const [joinCode, setJoinCode] = useState("");

  const startRaceTo = (dest: string) => {
    if (!username) {
      setPendingDestination(dest);
      setShowStartDialog(true);
    } else {
      setLocation(dest);
    }
  };

  const openRaceDialog = () => {
    setRaceDialogStep("root");
    setJoinCode("");
    setShowRaceDialog(true);
  };

  const handleConfirmStart = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setShowStartDialog(false);
      setLocation(pendingDestination);
    }
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

  const handleLocalRace = () => {
    if (!isAuthed) {
      setLocation("/auth");
      return;
    }
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
            onClick={handleLocalRace}
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

          {raceDialogStep === "root" && (
            <div className="grid gap-3 mt-4">
              <Button
                className="h-12 text-base font-semibold gap-2"
                onClick={() => {
                  setShowRaceDialog(false);
                  startRaceTo("/race?mode=public");
                }}
              >
                <Users className="w-5 h-5" />
                {language === "bn" ? "পাবলিক ম্যাচ" : "Public Match"}
              </Button>
              <Button
                variant="outline"
                className="h-12 text-base font-semibold gap-2"
                onClick={() => setRaceDialogStep("private")}
              >
                <Play className="w-5 h-5" />
                {language === "bn" ? "প্রাইভেট রুম" : "Private Room"}
              </Button>
            </div>
          )}

          {raceDialogStep === "private" && (
            <div className="grid gap-3 mt-4">
              <Button
                className="h-12 text-base font-semibold"
                onClick={() => {
                  setShowRaceDialog(false);
                  startRaceTo("/race?mode=private");
                }}
              >
                {language === "bn" ? "রুম তৈরি করুন" : "Create Room"}
              </Button>
              <Button
                variant="outline"
                className="h-12 text-base font-semibold"
                onClick={() => setRaceDialogStep("join")}
              >
                {language === "bn" ? "রুমে যোগ দিন" : "Join Room"}
              </Button>
              <Button
                variant="ghost"
                className="h-10"
                onClick={() => setRaceDialogStep("root")}
              >
                {language === "bn" ? "ফিরে যান" : "Back"}
              </Button>
            </div>
          )}

          {raceDialogStep === "join" && (
            <div className="grid gap-3 mt-4">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={language === "bn" ? "রুম কোড লিখুন" : "Enter room code"}
                className="h-12"
              />
              <Button
                className="h-12 text-base font-semibold"
                onClick={() => {
                  const code = joinCode.trim();
                  if (!code) return;
                  setShowRaceDialog(false);
                  startRaceTo(`/race?code=${encodeURIComponent(code)}`);
                }}
                disabled={!joinCode.trim()}
              >
                {language === "bn" ? "যোগ দিন" : "Join"}
              </Button>
              <Button
                variant="ghost"
                className="h-10"
                onClick={() => setRaceDialogStep("private")}
              >
                {language === "bn" ? "ফিরে যান" : "Back"}
              </Button>
            </div>
          )}
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
