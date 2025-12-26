import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/lib/stores/gameStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@shared/schema";

type PracticeLeaderboardRow = {
  rank: number;
  username: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  timeSeconds: number;
  country: string | null;
};

import { AnimatedBackground } from "@/components/game/AnimatedBackground";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { language, username, totalRaces, totalWins, bestWpm, totalAccuracy } = useGameStore();
  const [activeTab, setActiveTab] = useState<"alltime" | "weekly" | "daily" | "practice">("alltime");
  const handleTabChange = (value: string) => setActiveTab(value as any);

  const [practiceTime, setPracticeTime] = useState<15 | 30 | 60 | 120>(30);
  const [practiceCountry, setPracticeCountry] = useState("BD");

  const { data: leaderboardData, isLoading, isError } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/leaderboard?period=${activeTab}`],
    enabled: activeTab !== "practice",
  });

  const {
    data: practiceLeaderboard,
    isLoading: isLoadingPractice,
    isError: isErrorPractice,
  } = useQuery<PracticeLeaderboardRow[]>({
    queryKey: [
      `/api/practice/leaderboard?timeSeconds=${practiceTime}&country=${encodeURIComponent(
        practiceCountry
      )}&language=${language}`,
    ],
    enabled: activeTab === "practice",
  });


  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-400/10 border-yellow-400/30";
      case 2:
        return "bg-gray-300/10 border-gray-300/30";
      case 3:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "";
    }
  };

  const playerRank = totalRaces > 0 ? Math.max(11 - Math.floor(bestWpm / 10), 1) : null;

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 pointer-events-none z-0">
        <AnimatedBackground />
      </div>
      <div className="absolute inset-0 bg-background/60 pointer-events-none z-0" aria-hidden />

      <main className="relative z-10 flex-1 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="alltime" data-testid="tab-alltime">
                {language === "bn" ? "সর্বকালের" : "All-Time"}
              </TabsTrigger>
              <TabsTrigger value="weekly" data-testid="tab-weekly">
                {language === "bn" ? "সাপ্তাহিক" : "Weekly"}
              </TabsTrigger>
              <TabsTrigger value="daily" data-testid="tab-daily">
                {language === "bn" ? "দৈনিক" : "Daily"}
              </TabsTrigger>
              <TabsTrigger value="practice" data-testid="tab-practice">
                {language === "bn" ? "প্র্যাকটিস" : "Practice"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="alltime" className="space-y-4">
              {isLoading ? (
                <LeaderboardSkeleton />
              ) : isError ? (
                <LeaderboardError language={language} />
              ) : (
                <LeaderboardTable
                  entries={leaderboardData || []}
                  language={language}
                  getRankIcon={getRankIcon}
                  getRankClass={getRankClass}
                />
              )}
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4">
              {isLoading ? (
                <LeaderboardSkeleton />
              ) : isError ? (
                <LeaderboardError language={language} />
              ) : (
                <LeaderboardTable
                  entries={(leaderboardData || []).slice(0, 5)}
                  language={language}
                  getRankIcon={getRankIcon}
                  getRankClass={getRankClass}
                />
              )}
            </TabsContent>

            <TabsContent value="daily" className="space-y-4">
              {isLoading ? (
                <LeaderboardSkeleton />
              ) : isError ? (
                <LeaderboardError language={language} />
              ) : (
                <LeaderboardTable
                  entries={(leaderboardData || []).slice(0, 3)}
                  language={language}
                  getRankIcon={getRankIcon}
                  getRankClass={getRankClass}
                />
              )}
            </TabsContent>

            <TabsContent value="practice" className="space-y-4">
              <Card className="p-4 flex flex-wrap items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {language === "bn" ? "সময়" : "Time"}
                </div>
                {[15, 30, 60, 120].map((t) => (
                  <Button
                    key={t}
                    variant={practiceTime === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPracticeTime(t as any)}
                  >
                    {t}s
                  </Button>
                ))}

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Country</span>
                  <Input
                    value={practiceCountry}
                    onChange={(e) => setPracticeCountry(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="h-8 w-20"
                    placeholder="BD"
                  />
                </div>
              </Card>

              {isLoadingPractice ? (
                <LeaderboardSkeleton />
              ) : isErrorPractice ? (
                <LeaderboardError language={language} />
              ) : (
                <PracticeLeaderboardTable entries={practiceLeaderboard || []} language={language} />
              )}
            </TabsContent>
          </Tabs>

          {totalRaces > 0 && (
            <Card className="mt-6 p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {playerRank || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{username || "You"}</p>
                    <p className="text-sm text-muted-foreground">
                      {language === "bn" ? "আপনার র‍্যাঙ্ক" : "Your Rank"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="font-bold text-primary">{Math.round(bestWpm)}</p>
                    <p className="text-xs text-muted-foreground">WPM</p>
                  </div>
                  <div>
                    <p className="font-bold">{Math.round(totalAccuracy)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {language === "bn" ? "নির্ভুলতা" : "Accuracy"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">{totalRaces}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === "bn" ? "রেস" : "Races"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-success">{totalWins}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === "bn" ? "জয়" : "Wins"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {totalRaces === 0 && (
            <Card className="mt-6 p-8 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-heading font-semibold mb-2">
                {language === "bn" ? "এখনও কোন রেস নেই" : "No Races Yet"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {language === "bn"
                  ? "লিডারবোর্ডে আপনার নাম দেখতে রেস শুরু করুন!"
                  : "Start racing to see your name on the leaderboard!"}
              </p>
              <Button onClick={() => setLocation("/?start=race")} data-testid="button-start-racing">
                {language === "bn" ? "রেস শুরু করুন" : "Start Racing"}
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div>Rank</div>
        <div className="col-span-2">Player</div>
        <div className="text-right">WPM</div>
        <div className="text-right">Acc</div>
        <div className="text-right">Wins</div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3 rounded-lg">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 col-span-2" />
          <Skeleton className="h-5 w-12 ml-auto" />
          <Skeleton className="h-5 w-12 ml-auto" />
          <Skeleton className="h-5 w-10 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function LeaderboardError({ language }: { language: string }) {
  return (
    <Card className="p-8 text-center">
      <Trophy className="w-12 h-12 mx-auto text-destructive/50 mb-4" />
      <h3 className="font-heading font-semibold mb-2">
        {language === "bn" ? "লোড করতে ব্যর্থ" : "Failed to Load"}
      </h3>
      <p className="text-muted-foreground text-sm">
        {language === "bn"
          ? "দয়া করে আবার চেষ্টা করুন।"
          : "Please try again later."}
      </p>
    </Card>
  );
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  language: string;
  getRankIcon: (rank: number) => React.ReactNode;
  getRankClass: (rank: number) => string;
}

function PracticeLeaderboardTable({
  entries,
  language,
}: {
  entries: PracticeLeaderboardRow[];
  language: string;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>{language === "bn" ? "র‍্যাঙ্ক" : "Rank"}</div>
            <div className="col-span-2">{language === "bn" ? "প্লেয়ার" : "Player"}</div>
            <div className="text-right">WPM</div>
            <div className="text-right">RAW</div>
            <div className="text-right">Acc</div>
            <div className="text-right">Err</div>
          </div>

          {entries.map((e) => (
            <div
              key={e.rank}
              className="grid grid-cols-7 gap-4 px-4 py-3 rounded-lg border border-transparent transition-colors hover-elevate"
            >
              <div className="font-bold">{e.rank}</div>
              <div className="col-span-2 font-medium truncate">{e.username}</div>
              <div className="text-right font-bold text-primary">{e.wpm}</div>
              <div className="text-right">{e.rawWpm}</div>
              <div className="text-right">{e.accuracy}%</div>
              <div className="text-right">{e.errors}</div>
            </div>
          ))}
        </div>
      </div>

      {entries.length === 0 && (
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-heading font-semibold mb-2">
            {language === "bn" ? "কোন প্র্যাকটিস স্কোর নেই" : "No Practice Scores Yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {language === "bn"
              ? "৯৫%+ নির্ভুলতায় ১৫/৩০/৬০/১২০ সেকেন্ড টাইম টেস্ট শেষ করুন।"
              : "Finish a 15/30/60/120s time test with 95%+ accuracy to enter the leaderboard."}
          </p>
        </Card>
      )}
    </div>
  );
}

function LeaderboardTable({
  entries,
  language,
  getRankIcon,
  getRankClass,
}: LeaderboardTableProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>{language === "bn" ? "র‍্যাঙ্ক" : "Rank"}</div>
            <div className="col-span-2">{language === "bn" ? "প্লেয়ার" : "Player"}</div>
            <div className="text-right">WPM</div>
            <div className="text-right">{language === "bn" ? "নির্ভুলতা" : "Acc"}</div>
            <div className="text-right">{language === "bn" ? "জয়" : "Wins"}</div>
          </div>

          {entries.map((entry) => (
            <div
              key={entry.rank}
              className={cn(
                "grid grid-cols-6 gap-4 px-4 py-3 rounded-lg border border-transparent transition-colors hover-elevate",
                getRankClass(entry.rank)
              )}
              data-testid={`leaderboard-row-${entry.rank}`}
            >
              <div className="flex items-center gap-2">
                {getRankIcon(entry.rank)}
                <span className="font-bold">{entry.rank}</span>
              </div>
              <div className="col-span-2 font-medium truncate">{entry.username}</div>
              <div className="text-right font-bold text-primary">{entry.wpm}</div>
              <div className="text-right">{entry.accuracy}%</div>
              <div className="text-right text-success">{entry.wins}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
