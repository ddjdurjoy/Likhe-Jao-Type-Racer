import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Language } from "@shared/schema";
import {
  usePracticeStore,
  type PracticeMode,
  type BanglaInputMode,
} from "@/lib/stores/practiceStore";

const timePresets = [15, 30, 60, 120] as const;
const wordPresets = [10, 25, 50, 100] as const;

function SegButton({
  active,
  children,
  onClick,
  className,
  title,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  );
}

export function PracticeTopBar({
  language,
  timerText,
  timerTitle,
  timerUrgent,
  timerCritical,
  timerZero,
  onRestart,
}: {
  language: Language;
  timerText: string | null;
  timerTitle?: string;
  timerUrgent?: boolean;
  timerCritical?: boolean;
  timerZero?: boolean;
  onRestart: () => void;
}) {
  const {
    mode,
    setMode,
    timeSeconds,
    setTimeSeconds,
    wordCount,
    setWordCount,
    customTimeSeconds,
    setCustomTimeSeconds,
    customWordCount,
    setCustomWordCount,
    customText,
    setCustomText,
    stopOnWordEnd,
    setStopOnWordEnd,
    banglaInputMode,
    setBanglaInputMode,
  } = usePracticeStore();

  const modeLabel = (m: PracticeMode) => {
    if (language === "bn") {
      if (m === "time") return "সময়";
      if (m === "words") return "শব্দ";
      if (m === "custom") return "নিজস্ব";
    }
    if (m === "custom") return "custom";
    return m;
  };

  const banglaModeLabel = (m: BanglaInputMode) => {
    if (language === "bn") return m === "unicode" ? "ইউনিকোড" : "বিজয়";
    return m === "unicode" ? "Unicode" : "Bijoy";
  };

  return (
    <div className="px-1 py-1 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {( ["time", "words", "custom"] as PracticeMode[] ).map((m) => (
            <SegButton
              key={m}
              active={mode === m}
              onClick={() => setMode(m)}
            >
              {modeLabel(m)}
            </SegButton>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {timerText && (
            <div
              className={cn(
                "px-3 py-1.5 rounded-md",
                timerZero
                  ? "bg-destructive/30 text-destructive"
                  : timerCritical
                    ? "bg-destructive/25 text-destructive"
                    : timerUrgent
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted/40",
                "text-base md:text-lg font-bold tabular-nums",
                "min-w-[5.6rem] text-center",
                timerUrgent && "animate-pulse",
                timerCritical && "animate-[pulse_0.6s_ease-in-out_infinite]",
                timerZero && "animate-[pulse_0.35s_ease-in-out_infinite] ring-2 ring-destructive/60"
              )}
              title={timerTitle}
              data-testid="practice-timer"
            >
              {timerText}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRestart}
            data-testid="button-practice-restart"
          >
            {language === "bn" ? "রিস্টার্ট" : "Restart"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {mode === "time" && (
          <div className="flex flex-wrap items-center gap-2">
            {timePresets.map((t) => (
              <SegButton
                key={t}
                active={timeSeconds === t}
                onClick={() => setTimeSeconds(t)}
              >
                {t}
              </SegButton>
            ))}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">custom</span>
              <Input
                value={customTimeSeconds}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setCustomTimeSeconds(Math.max(1, Math.floor(n)));
                }}
                inputMode="numeric"
                className="h-8 w-20"
              />
              <SegButton
                active={timeSeconds === customTimeSeconds}
                onClick={() => setTimeSeconds(customTimeSeconds)}
                title="use custom time"
              >
                set
              </SegButton>
            </div>
          </div>
        )}

        {mode === "words" && (
          <div className="flex flex-wrap items-center gap-2">
            {wordPresets.map((c) => (
              <SegButton
                key={c}
                active={wordCount === c}
                onClick={() => setWordCount(c)}
              >
                {c}
              </SegButton>
            ))}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">custom</span>
              <Input
                value={customWordCount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setCustomWordCount(Math.max(1, Math.floor(n)));
                }}
                inputMode="numeric"
                className="h-8 w-24"
              />
              <SegButton
                active={wordCount === customWordCount}
                onClick={() => setWordCount(customWordCount)}
                title="use custom word count"
              >
                set
              </SegButton>
            </div>
          </div>
        )}

        {mode === "time" && (
          <div className="flex items-center gap-2">
            <Switch
              checked={stopOnWordEnd}
              onCheckedChange={setStopOnWordEnd}
              id="practice-stop-on-word"
            />
            <label
              htmlFor="practice-stop-on-word"
              className="text-sm text-muted-foreground select-none"
              title={
                language === "bn"
                  ? "সময় শেষ হলে শব্দের মাঝখানে থামবে না, শব্দ শেষ করে থামবে"
                  : "When time runs out, finish the current word before stopping"
              }
            >
              {language === "bn" ? "শব্দ শেষে থামুন" : "stop on word"}
            </label>
          </div>
        )}

        {mode === "custom" && (
          <div className="w-full flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              {language === "bn" ? "নিজস্ব টেক্সট" : "Custom text"}
            </div>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={
                language === "bn"
                  ? "এখানে নিজের টেক্সট পেস্ট/লিখুন..."
                  : "Paste/type your own text here..."
              }
              className={cn(
                "w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            />
          </div>
        )}

        {language === "bn" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {language === "bn" ? "ইনপুট" : "Input"}
            </span>
            <div className="flex items-center gap-1">
              {( ["unicode", "bijoy"] as BanglaInputMode[] ).map((m) => (
                <SegButton
                  key={m}
                  active={banglaInputMode === m}
                  onClick={() => setBanglaInputMode(m)}
                >
                  {banglaModeLabel(m)}
                </SegButton>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {language === "bn" ? "শর্টকাট: Tab = Restart" : "Shortcut: Tab = Restart"}
      </div>
    </div>
  );
}
