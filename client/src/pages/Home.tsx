import { useState } from "react";
import { useLocation } from "wouter";
import { useGameStore, CARS } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { WeatherToggle } from "@/components/ui/WeatherToggle";
import { LanguageToggle, LanguageSelector } from "@/components/ui/LanguageToggle";
import { SoundControls } from "@/components/ui/SoundControls";
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
import { Play, Users, Trophy, Settings, Zap, Target, Clock } from "lucide-react";
import type { Difficulty, Language } from "@shared/schema";

import { AnimatedBackground } from "@/components/game/AnimatedBackground";

export default function Home() {
  const [, setLocation] = useLocation();
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

  const [showSettings, setShowSettings] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  const handleStartRace = () => {
    if (!username) {
      setShowStartDialog(true);
    } else {
      setLocation("/race");
    }
  };

  const handleConfirmStart = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setShowStartDialog(false);
      setLocation("/race");
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

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <AnimatedBackground />
      </div>
      <div className="absolute inset-0 bg-background/60" aria-hidden />

      <header className="relative z-10 flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {language === "bn" ? (
            <img src="/Logo%20For%20Bengali.svg" alt="লিখে যাও" className="h-10 w-auto" />
          ) : (
            <img src="/Logo%20For%20English.svg" alt="Likhe Jao" className="h-10 w-auto" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <SoundControls />
          <WeatherToggle />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center space-y-4 max-w-lg">
          <h2 className="text-4xl md:text-5xl font-display font-bold animated-heading">
            {language === "bn" ? "লিখে যাও" : "Type to Win"}
          </h2>
          <p className="text-lg text-muted-foreground">
            {language === "bn"
              ? "দ্রুত টাইপ করুন, রেসে জিতুন!"
              : "Race against AI or friends. Type fast, win races!"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <Button
            size="lg"
            className="h-20 text-lg font-semibold gap-3"
            onClick={handleStartRace}
            data-testid="button-start-race"
          >
            <Play className="w-6 h-6" />
            {language === "bn" ? "রেস শুরু করুন" : "Start Race"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-20 text-lg font-semibold gap-3"
            onClick={handlePractice}
            data-testid="button-practice"
          >
            <Target className="w-6 h-6" />
            {language === "bn" ? "অনুশীলন" : "Practice Mode"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-20 text-lg font-semibold gap-3"
            onClick={handleGarage}
            data-testid="button-garage"
          >
            <Zap className="w-6 h-6" />
            {language === "bn" ? "গ্যারেজ" : "Garage"}
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-20 text-lg font-semibold gap-3"
            onClick={handleLeaderboard}
            data-testid="button-leaderboard"
          >
            <Trophy className="w-6 h-6" />
            {language === "bn" ? "লিডারবোর্ড" : "Leaderboard"}
          </Button>
        </div>

        {totalRaces > 0 && (
          <div className="w-full max-w-2xl p-6 bg-transparent border border-card-border rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {language === "bn" ? "আপনার পরিসংখ্যান" : "Your Stats"}
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{totalRaces}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "রেস" : "Races"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{totalWins}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "জয়" : "Wins"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(bestWpm)}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "সেরা WPM" : "Best WPM"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Math.round(avgWpm)}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "bn" ? "গড় WPM" : "Avg WPM"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 opacity-60">
          <CarPreview carId={selectedCarId} size="sm" />
          <span className="text-sm text-muted-foreground">
            {CARS[selectedCarId]?.name || "Your Car"}
          </span>
        </div>
      </main>

      <footer className="relative z-10 p-4 text-center text-sm text-muted-foreground border-t border-border">
        <span>© 2026 </span>
        <a href="https://www.youtube.com/@ddjDurjoy" target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
          Durjoy Sir
        </a>
        <span> | All rights reserved.</span>
      </footer>

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

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "bn" ? "সেটিংস" : "Settings"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
<div className="space-y-2">
              <label className="text-sm font-medium">
                {language === "bn" ? "নাম" : "Username"}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={language === "bn" ? "নাম লিখুন..." : "Enter name..."}
                data-testid="input-settings-username"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === "bn" ? "ভাষা" : "Language"}
              </label>
              <LanguageSelector value={language} onChange={setLanguage} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {language === "bn" ? "কঠিনতা" : "Difficulty"}
              </label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">
                    {language === "bn" ? "সহজ (15-30 WPM AI)" : "Easy (15-30 WPM AI)"}
                  </SelectItem>
                  <SelectItem value="medium">
                    {language === "bn" ? "মাঝারি (35-55 WPM AI)" : "Medium (35-55 WPM AI)"}
                  </SelectItem>
                  <SelectItem value="hard">
                    {language === "bn" ? "কঠিন (60-90 WPM AI)" : "Hard (60-90 WPM AI)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
