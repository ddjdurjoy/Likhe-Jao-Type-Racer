import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PracticeResultStats, TypingTestMode, WordResult } from "@/hooks/useTypingEngine";
import { ReplayViewer } from "@/components/game/ReplayViewer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function PracticeResults({
  result,
  mode,
  timeSeconds,
  wordCount,
  language,
  isAuthed,
  pb,
  pbBeforeRun,
  historyKey,
  onGoToAuth,
  onClose,
  onRestart,
  onContinue,
}: {
  result: PracticeResultStats;
  mode: TypingTestMode;
  timeSeconds: number;
  wordCount: number;
  language: "en" | "bn";
  isAuthed: boolean;
  pb: number | null;
  pbBeforeRun: number | null;
  historyKey: string;
  onGoToAuth: () => void;
  onClose: () => void;
  onRestart: () => void;
  onContinue: () => void;
}) {
  const err = Math.round(result.incorrectChars + result.missedChars + result.extraChars);
  const newPb = pbBeforeRun !== null && result.wpm > pbBeforeRun;

  const subtitle =
    mode === "time"
      ? `${timeSeconds}s`
      : mode === "words"
        ? `${wordCount} words`
        : mode;

  const chartData = useMemo(() => {
    const w = result.chart?.wpm ?? [];
    const r = result.chart?.raw ?? [];
    const len = Math.max(w.length, r.length);
    return Array.from({ length: len }, (_, i) => ({
      t: i + 1,
      wpm: w[i] ?? null,
      raw: r[i] ?? null,
    }));
  }, [result.chart]);

  const history10 = useMemo(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      const parsed = raw ? (JSON.parse(raw) as any[]) : [];
      return parsed
        .slice()
        .reverse()
        .map((x, i) => ({
          run: i + 1,
          wpm: x.wpm,
          raw: x.raw,
          acc: x.acc,
        }));
    } catch {
      return [] as { run: number; wpm: number; raw: number; acc: number }[];
    }
  }, [historyKey]);

  // Replay UI state
  const [isReplayOpen, setIsReplayOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      data-testid="practice-results"
      onMouseDown={(e) => {
        // allow click outside to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-4xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto">
        <Card className="p-4 sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">{language === "bn" ? "ফলাফল" : "Results"}</h2>
              <div className="text-xs sm:text-sm text-muted-foreground">{subtitle}</div>
            </div>
            <Button variant="outline" onClick={onClose} size="sm" className="shrink-0">
              {language === "bn" ? "বন্ধ" : "Close"}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mt-4 sm:mt-6">
            <ResultStat label="WPM" value={result.wpm} highlight badge={newPb ? (language === "bn" ? "নতুন PB" : "NEW PB") : undefined} />
            <ResultStat label={language === "bn" ? "র" : "Raw"} value={result.rawWpm} />
            <ResultStat label={language === "bn" ? "নির্ভুলতা" : "Accuracy"} value={`${result.accuracy}%`} />
            <ResultStat label={language === "bn" ? "সামঞ্জস্য" : "Consistency"} value={`${result.consistency}%`} />
            <ResultStat label={language === "bn" ? "ত্রুটি" : "Errors"} value={err} />
            <ResultStat label={language === "bn" ? "সময়" : "Time"} value={`${result.timeSeconds}s`} />
          </div>

          {pb !== null && (
            <div className="mt-3 text-xs text-muted-foreground tabular-nums">
              {language === "bn" ? "PB" : "pb"}: <span className="text-foreground font-semibold">{pb}</span>
              {newPb ? (
                <span className="ml-2 text-primary font-semibold">
                  {language === "bn" ? "(নতুন!)" : "(new!)"}
                </span>
              ) : null}
            </div>
          )}

          <div className="mt-3 sm:mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-lg border border-card-border p-3 sm:p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {language === "bn" ? "গ্রাফ" : "Chart"}
              </div>
              {chartData.length ? (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} width={28} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelFormatter={(l) => `${l}s`}
                      />
                      <Line
                        type="monotone"
                        dataKey="wpm"
                        stroke="hsl(var(--primary))"
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line type="monotone" dataKey="raw" stroke="hsl(var(--muted-foreground))" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{language === "bn" ? "গ্রাফ নেই" : "No chart"}</div>
              )}

              {history10.length ? (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    {language === "bn" ? "শেষ ১০ রান" : "Last 10 runs"}
                  </div>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history10} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                        <XAxis dataKey="run" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} width={28} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelFormatter={(l) => `run ${l}`}
                        />
                        <Line type="monotone" dataKey="wpm" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-card-border p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {language === "bn" ? "ডিটেইলস" : "Details"}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5 sm:mb-2">
                    {language === "bn" ? "ক্যারেক্টারস" : "Characters"}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm tabular-nums">
                    <ErrorRow label={language === "bn" ? "সঠিক" : "Correct"} value={Math.round(result.correctWordChars + result.correctSpaces)} />
                    <ErrorRow label={language === "bn" ? "ভুল" : "Incorrect"} value={Math.round(result.incorrectChars)} />
                    <ErrorRow label={language === "bn" ? "মিস" : "Missed"} value={Math.round(result.missedChars)} />
                    <ErrorRow label={language === "bn" ? "এক্সট্রা" : "Extra"} value={Math.round(result.extraChars)} />
                    <ErrorRow label={language === "bn" ? "স্পেস" : "Spaces"} value={Math.round(result.spaces)} />
                    <ErrorRow label={language === "bn" ? "মোট" : "Total"} value={Math.round(result.totalChars)} />
                  </div>
                </div>

                <div>
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wide mb-1.5 sm:mb-2">
                    {language === "bn" ? "কিস্ট্রোকস" : "Keystrokes"}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm tabular-nums">
                    <ErrorRow label={language === "bn" ? "সঠিক" : "Correct"} value={Math.round(result.accuracyCorrect)} />
                    <ErrorRow label={language === "bn" ? "ভুল" : "Incorrect"} value={Math.round(result.accuracyIncorrect)} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {language === "bn"
                      ? `এটা কী-প্রেস ভিত্তিক একুরেসি: ${result.accuracy}%`
                      : `Keypress-based accuracy: ${result.accuracy}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {result.wordResults?.length ? (
            <div className="mt-3 sm:mt-4 rounded-lg border border-card-border p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {language === "bn" ? "শব্দ" : "Words"}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 leading-none">
                {result.wordResults.slice(0, 250).map((w, idx) => (
                  <WordPill key={idx} w={w} />
                ))}
              </div>
              {result.wordResults.length > 250 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {language === "bn" ? "শুধু প্রথম ২৫০টি দেখানো হচ্ছে" : "Showing first 250 words"}
                </div>
              )}
            </div>
          ) : null}

          {!isAuthed ? (
            <div className="mt-4 sm:mt-6 rounded-lg border border-card-border p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="text-[10px] sm:text-xs text-muted-foreground">
                {language === "bn"
                  ? "স্ট্যাটস সেভ করতে হলে সাইন আপ / লগইন করতে হবে।"
                  : "To save your stats, you need to sign up / log in."}
              </div>
              <Button variant="outline" size="sm" onClick={onGoToAuth} className="shrink-0">
                {language === "bn" ? "সাইন আপ / লগইন" : "Sign up / Log in"}
              </Button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button className="flex-1" onClick={onRestart} size="sm">
              {language === "bn" ? "আবার" : "Restart"}
            </Button>

            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => setIsReplayOpen(true)}
              disabled={!result.replay?.events?.length}
              title={!result.replay?.events?.length ? "Replay not available" : undefined}
              size="sm"
            >
              {language === "bn" ? "রিপ্লে দেখুন" : "Watch replay"}
            </Button>

            <Button className="flex-1" variant="outline" onClick={onContinue} size="sm">
              {language === "bn" ? "চালিয়ে যান" : "Continue"}
            </Button>
          </div>
        </Card>
      </div>

      {isReplayOpen && result.replay ? (
        <ReplayViewer
          replay={result.replay}
          language={language}
          onClose={() => setIsReplayOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ResultStat({
  label,
  value,
  highlight,
  badge,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div className={cn("rounded-lg p-2 sm:p-3 border", highlight ? "border-primary/40" : "border-card-border")}>
      <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="flex items-center gap-1 sm:gap-2">
        <div className={cn("text-lg sm:text-xl md:text-2xl font-bold tabular-nums", highlight ? "text-primary" : "text-foreground")}>
          {value}
        </div>
        {badge ? (
          <span className="text-[8px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WordPill({ w }: { w: WordResult }) {
  const cls =
    w.severity === 0
      ? "bg-success/15 text-success border-success/30"
      : w.severity === 1
        ? "bg-warning/15 text-warning border-warning/30"
        : w.severity === 2
          ? "bg-destructive/15 text-destructive border-destructive/30"
          : "bg-destructive/25 text-destructive border-destructive/50";

  const title = `expected: ${w.expected}\ntyped: ${w.typed}\nincorrect:${w.incorrect} extra:${w.extra} missed:${w.missed}\nseverity:${w.severity}`;

  return (
    <span
      className={cn(
        "text-xs sm:text-sm md:text-base px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border tabular-nums",
        "font-medium",
        cls
      )}
      title={title}
    >
      {w.expected || w.typed || "_"}
    </span>
  );
}

function ErrorRow({ label, value }: { label: string; value: number }) {

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold text-foreground">{value}</div>
    </div>
  );
}
