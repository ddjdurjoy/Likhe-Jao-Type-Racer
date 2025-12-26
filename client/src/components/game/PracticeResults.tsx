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
              {headerAddon ? <div className="mt-2">{headerAddon}</div> : null}
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
            <ResultStat label={language === "bn" ? "সময়" : "Time"} value={`${result.timeSeconds}s`} />
            {(extraStats ?? []).map((s) => (
              <ResultStat key={s.label} label={s.label} value={s.value} highlight={s.highlight} badge={s.badge} />
            ))}
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
            <div className="rounded-lg border border-card-border p-3 sm:p-4 bg-card/30">
              <div className="text-xs sm:text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                <span>{language === "bn" ? "পারফরম্যান্স গ্রাফ" : "Performance Chart"}</span>
                {chartData.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {language === "bn" ? `${chartData.length} সেকেন্ড` : `${chartData.length}s`}
                  </span>
                )}
              </div>
              {chartData.length ? (
                <div className="h-[200px] sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="colorWpm" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRaw" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="t" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        stroke="hsl(var(--border))"
                        label={{ value: language === "bn" ? "সময় (সে)" : "Time (s)", position: 'insideBottom', offset: -5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                        stroke="hsl(var(--border))"
                        width={35}
                        label={{ value: 'WPM', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                          padding: "8px 12px",
                        }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                        labelFormatter={(l) => `${language === "bn" ? "সময়:" : "Time:"} ${l}s`}
                        formatter={(value: any, name: string) => {
                          const label = name === 'wpm' ? 'WPM' : (language === "bn" ? "রও" : "Raw");
                          return [value, label];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="raw"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.5}
                        dot={false}
                        fill="url(#colorRaw)"
                        name="raw"
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="wpm"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        dot={false}
                        fill="url(#colorWpm)"
                        name="wpm"
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  {language === "bn" ? "গ্রাফ ডেটা উপলব্ধ নেই" : "No chart data available"}
                </div>
              )}

              {history10.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs sm:text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                    <span>{language === "bn" ? "সাম্প্রতিক ইতিহাস" : "Recent History"}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {language === "bn" ? `${history10.length} রান` : `${history10.length} runs`}
                    </span>
                  </div>
                  <div className="h-[140px] sm:h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history10} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <defs>
                          <linearGradient id="colorHistoryWpm" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                        <XAxis 
                          dataKey="run" 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                          label={{ value: language === "bn" ? "রান #" : "Run #", position: 'insideBottom', offset: -5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                          width={35}
                          label={{ value: 'WPM', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                            padding: "8px 12px",
                          }}
                          labelStyle={{ fontWeight: 'bold', marginBottom: 4 }}
                          labelFormatter={(l) => `${language === "bn" ? "রান" : "Run"} #${l}`}
                          formatter={(value: any, name: string) => {
                            const label = name === 'wpm' ? 'WPM' : name === 'acc' ? (language === "bn" ? "নির্ভুলতা" : "Accuracy") : name;
                            return [value, label];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="wpm" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                          fill="url(#colorHistoryWpm)"
                          name="wpm"
                        />
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
