import React, { useEffect, useMemo, useState } from "react";
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
  headerAddon,
  extraStats,
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
  headerAddon?: React.ReactNode;
  extraStats?: Array<{ label: string; value: string | number; highlight?: boolean; badge?: string }>;
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
    
    // Filter out invalid data points and cap at reasonable maximums
    const MAX_WPM = 500;
    const MAX_RAW = 1000;
    
    return Array.from({ length: len }, (_, i) => {
      const wpmVal = w[i];
      const rawVal = r[i];
      
      // Validate and cap WPM
      const validWpm = (wpmVal !== null && wpmVal !== undefined && !isNaN(wpmVal) && wpmVal >= 0 && wpmVal <= MAX_WPM)
        ? Math.round(wpmVal)
        : null;
      
      // Validate and cap RAW
      const validRaw = (rawVal !== null && rawVal !== undefined && !isNaN(rawVal) && rawVal >= 0 && rawVal <= MAX_RAW)
        ? Math.round(rawVal)
        : null;
      
      return {
        t: i + 1,
        wpm: validWpm,
        raw: validRaw,
      };
    }).filter(d => d.wpm !== null || d.raw !== null); // Remove entries where both are null
  }, [result.chart]);

  const history10 = useMemo(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      const parsed = raw ? (JSON.parse(raw) as any[]) : [];
      return parsed
        .slice()
        .reverse()
        .slice(0, 10) // Only take last 10
        .map((x, i) => ({
          run: i + 1,
          wpm: typeof x.wpm === 'number' && !isNaN(x.wpm) ? Math.round(x.wpm) : 0,
          raw: typeof x.raw === 'number' && !isNaN(x.raw) ? Math.round(x.raw) : 0,
          acc: typeof x.acc === 'number' && !isNaN(x.acc) ? Math.round(x.acc) : 0,
        }))
        .filter(x => x.wpm > 0); // Only show valid runs
    } catch {
      return [] as { run: number; wpm: number; raw: number; acc: number }[];
    }
  }, [historyKey]);

  // Replay UI state
  const [isReplayOpen, setIsReplayOpen] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4"
      data-testid="practice-results"
      onMouseDown={(e) => {
        // allow click outside to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-4xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto">
        <Card className="p-4 sm:p-6 md:p-8 bg-background/95 backdrop-blur-sm border-border/50">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 sm:h-8 bg-primary rounded-full" />
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{language === "bn" ? "ফলাফল" : "Test Complete"}</h2>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</div>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} size="sm" className="shrink-0 hover:bg-muted/50 h-8 w-8 p-0">
              <span className="text-lg">×</span>
            </Button>
          </div>

          {/* Main Stats - Monkeytype Style */}
          <div className="space-y-6 mb-8">
            {/* Primary Stats Row */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
              {/* WPM - Large Display */}
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-baseline gap-2 sm:gap-3">
                  <div className={cn(
                    "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tabular-nums leading-none",
                    newPb ? "text-primary" : "text-foreground"
                  )}>
                    {result.wpm}
                  </div>
                  <div className="flex flex-col gap-1 pb-1 sm:pb-2">
                    <div className="text-base sm:text-lg font-semibold text-muted-foreground">WPM</div>
                    {newPb && (
                      <div className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 animate-pulse whitespace-nowrap">
                        {language === "bn" ? "নতুন PB!" : "NEW PB!"}
                      </div>
                    )}
                  </div>
                </div>
                {pb !== null && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {language === "bn" ? "সেরা" : "Personal best"}: <span className="font-semibold text-foreground">{pb}</span>
                  </div>
                )}
              </div>

              {/* Secondary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                <div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {language === "bn" ? "নির্ভুলতা" : "Accuracy"}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums">{result.accuracy}%</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {language === "bn" ? "র" : "Raw"}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-muted-foreground">{result.rawWpm}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {language === "bn" ? "সামঞ্জস্য" : "Consistency"}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums">{result.consistency}%</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {language === "bn" ? "সময়" : "Time"}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums">{result.timeSeconds}s</div>
                </div>
              </div>
            </div>

            {/* Errors Badge */}
            {err > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {language === "bn" ? "ত্রুটি" : "Errors"}
                </span>
                <span className="text-lg font-bold text-destructive tabular-nums">{err}</span>
              </div>
            )}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Performance Chart - Full Width on Mobile/Tablet */}
            <div className="rounded-xl border border-border/50 p-4 sm:p-5 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {language === "bn" ? "পারফরম্যান্স" : "Performance"}
                </h3>
                {chartData.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {language === "bn" ? `${chartData.length} সেকেন্ড` : `${chartData.length}s`}
                  </span>
                )}
              </div>
              {chartData.length ? (
                <div className="h-[220px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: -5 }}>
                      <defs>
                        <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRaw" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                      <XAxis 
                        dataKey="t" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        stroke="hsl(var(--border))"
                        tickLine={false}
                        label={{ value: language === "bn" ? "সময় (সে)" : "seconds", position: 'insideBottom', offset: -12, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        stroke="hsl(var(--border))"
                        tickLine={false}
                        width={40}
                        label={{ value: 'wpm', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                          padding: "8px 12px",
                        }}
                        labelStyle={{ fontWeight: '600', marginBottom: 4 }}
                        labelFormatter={(l) => `${l}s`}
                        formatter={(value: any, name: string) => {
                          const label = name === 'wpm' ? 'WPM' : (language === "bn" ? "রও" : "Raw");
                          return [value, label];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="raw"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        dot={false}
                        fill="url(#colorRaw)"
                        name="raw"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="wpm"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                        fill="url(#colorWpm)"
                        name="wpm"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  {language === "bn" ? "গ্রাফ ডেটা উপলব্ধ নেই" : "No chart data"}
                </div>
              )}
            </div>

            {/* Details / History Section */}
            <div className="rounded-xl border border-border/50 p-5 bg-muted/20">
              {history10.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      {language === "bn" ? "সাম্প্রতিক ইতিহাস" : "Recent History"}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {language === "bn" ? `${history10.length} রান` : `${history10.length} runs`}
                    </span>
                  </div>
                  <div className="h-[220px] sm:h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history10} margin={{ top: 5, right: 5, bottom: 20, left: -5 }}>
                        <defs>
                          <linearGradient id="colorHistoryWpm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} vertical={false} />
                        <XAxis 
                          dataKey="run" 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                          tickLine={false}
                          label={{ value: language === "bn" ? "রান #" : "test #", position: 'insideBottom', offset: -12, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                          tickLine={false}
                          width={40}
                          label={{ value: 'wpm', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                            padding: "8px 12px",
                          }}
                          labelStyle={{ fontWeight: '600', marginBottom: 4 }}
                          labelFormatter={(l) => `${language === "bn" ? "রান" : "Test"} #${l}`}
                          formatter={(value: any, name: string) => {
                            const label = name === 'wpm' ? 'WPM' : name === 'acc' ? (language === "bn" ? "নির্ভুলতা" : "Accuracy") : name;
                            return [value, label];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="wpm" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2.5}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          fill="url(#colorHistoryWpm)"
                          name="wpm"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="h-full">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
                    {language === "bn" ? "ডিটেইলস" : "Details"}
                  </h3>
                  <div className="space-y-4">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                      {language === "bn" ? "ক্যারেক্টারস" : "Characters"}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                      <ErrorRow label={language === "bn" ? "সঠিক" : "Correct"} value={Math.round(result.correctWordChars + result.correctSpaces)} />
                      <ErrorRow label={language === "bn" ? "ভুল" : "Incorrect"} value={Math.round(result.incorrectChars)} />
                      <ErrorRow label={language === "bn" ? "মিস" : "Missed"} value={Math.round(result.missedChars)} />
                      <ErrorRow label={language === "bn" ? "এক্সট্রা" : "Extra"} value={Math.round(result.extraChars)} />
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                        {language === "bn" ? "কিস্ট্রোকস" : "Keystrokes"}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                        <ErrorRow label={language === "bn" ? "সঠিক" : "Correct"} value={Math.round(result.accuracyCorrect)} />
                        <ErrorRow label={language === "bn" ? "ভুল" : "Incorrect"} value={Math.round(result.accuracyIncorrect)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Word Results */}
          {result.wordResults?.length ? (
            <div className="rounded-xl border border-border/50 p-5 bg-muted/20 mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">
                {language === "bn" ? "শব্দ বিশ্লেষণ" : "Word Analysis"}
              </h3>
              <div className="flex flex-wrap gap-2 leading-none">
                {result.wordResults.slice(0, 250).map((w, idx) => (
                  <WordPill key={idx} w={w} />
                ))}
              </div>
              {result.wordResults.length > 250 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {language === "bn" ? "প্রথম ২৫০টি শব্দ দেখানো হচ্ছে" : "Showing first 250 words"}
                </div>
              )}
            </div>
          ) : null}

          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 h-12 text-base font-semibold" 
              onClick={onRestart}
              size="lg"
            >
              {language === "bn" ? "আবার শুরু করুন" : "Next test"}
            </Button>

            <Button
              className="flex-1 h-12 text-base"
              variant="secondary"
              onClick={() => setIsReplayOpen(true)}
              disabled={!result.replay?.events?.length}
              title={!result.replay?.events?.length ? "Replay not available" : undefined}
              size="lg"
            >
              {language === "bn" ? "রিপ্লে" : "Watch replay"}
            </Button>

            <Button 
              className="flex-1 h-12 text-base" 
              variant="outline" 
              onClick={onContinue}
              size="lg"
            >
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
