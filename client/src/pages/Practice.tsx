import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useGameStore } from "@/lib/stores/gameStore";
import { useTypingEngine } from "@/hooks/useTypingEngine";
import { getRandomWords, getRandomQuote } from "@/lib/data/words";
import { TypingInput } from "@/components/game/TypingInput";
import { StatsDisplay } from "@/components/game/StatsDisplay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SoundControls } from "@/components/ui/SoundControls";
import { cn } from "@/lib/utils";
import { ArrowLeft, RefreshCw, BookOpen, MessageSquare, Code, Zap } from "lucide-react";
import type { Difficulty } from "@shared/schema";

type PracticeCategory = "common" | "quotes" | "code" | "random";

const categories = [
  { id: "common" as PracticeCategory, name: "Common Words", nameBn: "সাধারণ শব্দ", icon: BookOpen },
  { id: "quotes" as PracticeCategory, name: "Quotes", nameBn: "উক্তি", icon: MessageSquare },
  { id: "code" as PracticeCategory, name: "Code Snippets", nameBn: "কোড", icon: Code },
  { id: "random" as PracticeCategory, name: "Random Mix", nameBn: "মিশ্র", icon: Zap },
];

const codeSnippets = [
  "function hello world console log message",
  "const array map filter reduce forEach",
  "import export default module require",
  "async await promise then catch finally",
  "class constructor this extends super",
  "if else switch case break continue",
  "for while do loop iteration index",
  "try catch throw error exception",
  "let var const string number boolean",
  "return undefined null object array",
];

export default function Practice() {
  const [, setLocation] = useLocation();
  const { language, difficulty, setDifficulty } = useGameStore();

  const [category, setCategory] = useState<PracticeCategory>("common");
  const [words, setWords] = useState<string[]>([]);
  const [sessionStats, setSessionStats] = useState({
    totalWords: 0,
    totalWpm: 0,
    races: 0,
    bestWpm: 0,
  });

  const generateWords = useCallback(() => {
    let newWords: string[];

    switch (category) {
      case "quotes":
        newWords = getRandomQuote(language);
        break;
      case "code":
        const snippet = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
        newWords = snippet.split(" ");
        break;
      case "random":
        const difficulties: Difficulty[] = ["easy", "medium", "hard"];
        const randomDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
        newWords = getRandomWords(language, randomDiff, 15);
        break;
      default:
        newWords = getRandomWords(language, difficulty, 15);
    }

    setWords(newWords);
  }, [category, language, difficulty]);

  useEffect(() => {
    generateWords();
  }, [generateWords]);

  const handleComplete = useCallback(
    (stats: { wpm: number }) => {
      setSessionStats((prev) => ({
        totalWords: prev.totalWords + words.length,
        totalWpm: prev.totalWpm + stats.wpm,
        races: prev.races + 1,
        bestWpm: Math.max(prev.bestWpm, stats.wpm),
      }));
      generateWords();
    },
    [words.length, generateWords]
  );

  const {
    currentInput,
    currentWordIndex,
    stats,
    isFinished,
    inputRef,
    handleKeyDown,
    handleChange,
    reset,
  } = useTypingEngine({
    words,
    onRaceComplete: handleComplete,
    enabled: true,
  });

  const handleReset = () => {
    reset();
    generateWords();
  };

  const handleBack = () => {
    setLocation("/");
  };

  const avgWpm =
    sessionStats.races > 0
      ? Math.round(sessionStats.totalWpm / sessionStats.races)
      : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === "bn" ? "ফিরে যান" : "Back"}
        </Button>

        <h1 className="text-xl font-display font-bold">
          {language === "bn" ? "অনুশীলন মোড" : "Practice Mode"}
        </h1>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <SoundControls />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        <aside className="w-full md:w-64 space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {language === "bn" ? "বিভাগ" : "Category"}
            </h3>
            <div className="space-y-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      reset();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                      category === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "hover-elevate"
                    )}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {language === "bn" ? cat.nameBn : cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {language === "bn" ? "কঠিনতা" : "Difficulty"}
            </h3>
            <div className="space-y-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => {
                    setDifficulty(diff);
                    reset();
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg transition-all text-left text-sm font-medium capitalize",
                    difficulty === diff
                      ? "bg-primary text-primary-foreground"
                      : "hover-elevate"
                  )}
                  data-testid={`button-difficulty-${diff}`}
                >
                  {language === "bn"
                    ? diff === "easy"
                      ? "সহজ"
                      : diff === "medium"
                      ? "মাঝারি"
                      : "কঠিন"
                    : diff}
                </button>
              ))}
            </div>
          </Card>

          {sessionStats.races > 0 && (
            <Card className="p-4 overflow-auto max-h-72">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {language === "bn" ? "সেশন পরিসংখ্যান" : "Session Stats"}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === "bn" ? "রাউন্ড" : "Rounds"}
                  </span>
                  <span className="font-medium">{sessionStats.races}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === "bn" ? "শব্দ" : "Words"}
                  </span>
                  <span className="font-medium">{sessionStats.totalWords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === "bn" ? "গড় WPM" : "Avg WPM"}
                  </span>
                  <span className="font-medium">{avgWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === "bn" ? "সেরা WPM" : "Best WPM"}
                  </span>
                  <span className="font-bold text-primary">{sessionStats.bestWpm}</span>
                </div>
              </div>
            </Card>
          )}
        </aside>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
              data-testid="button-reset-practice"
            >
              <RefreshCw className="w-4 h-4" />
              {language === "bn" ? "নতুন শব্দ" : "New Words"}
            </Button>

            <div className="shrink-0"><StatsDisplay stats={stats} compact /></div>
          </div>

          <Card className="flex-1 p-6 flex flex-col justify-center">
            <TypingInput
              words={words}
              currentWordIndex={currentWordIndex}
              currentInput={currentInput}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              disabled={isFinished}
            />

            {isFinished && (
              <div className="mt-6 text-center">
                <p className="text-lg text-success font-medium mb-4">
                  {language === "bn" ? "সম্পন্ন!" : "Complete!"}
                </p>
                <Button onClick={handleReset} data-testid="button-next-round">
                  {language === "bn" ? "পরবর্তী রাউন্ড" : "Next Round"}
                </Button>
              </div>
            )}
          </Card>

          <StatsDisplay stats={stats} />
        </div>
      </main>
    </div>
  );
}
