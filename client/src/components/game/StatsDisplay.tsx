import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { TypingStats } from "@shared/schema";

interface StatsDisplayProps {
  stats: TypingStats;
  position?: number;
  totalPlayers?: number;
  compact?: boolean;
}

export function StatsDisplay({
  stats,
  position,
  totalPlayers,
  compact = false,
}: StatsDisplayProps) {
  const { wpm, accuracy, progress } = stats;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm" data-testid="stats-display-compact">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">WPM</span>
          <span className="font-bold text-foreground">{wpm}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">ACC</span>
          <span className={cn(
            "font-bold",
            accuracy >= 95 ? "text-success" : accuracy >= 85 ? "text-warning" : "text-destructive"
          )}>
            {accuracy}%
          </span>
        </div>
        {position !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">POS</span>
            <span className="font-bold text-foreground">{position}/{totalPlayers}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" data-testid="stats-display">
      <div className="flex items-center justify-between gap-4">
        <StatCard
          label="WPM"
          value={wpm}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          label="Accuracy"
          value={`${accuracy}%`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
          color={accuracy >= 95 ? "success" : accuracy >= 85 ? "warning" : "destructive"}
        />
        {position !== undefined && (
          <StatCard
            label="Position"
            value={`${position}/${totalPlayers}`}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3 7h7l-5.5 4.5 2 7-6.5-4.5-6.5 4.5 2-7L2 9h7z" />
              </svg>
            }
            color={position === 1 ? "success" : position === 2 ? "warning" : "muted"}
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "destructive" | "muted";
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };

  return (
    <div className="flex-1 bg-transparent rounded-lg p-4 border border-card-border">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("opacity-70", colorClasses[color])}>{icon}</div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className={cn("text-2xl md:text-3xl font-bold", colorClasses[color])}>
        {value}
      </div>
    </div>
  );
}

interface RaceResultsProps {
  stats: TypingStats;
  position: number;
  totalPlayers: number;
  raceTime: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export function RaceResults({
  stats,
  position,
  totalPlayers,
  raceTime,
  onPlayAgain,
  onGoHome,
}: RaceResultsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const positionText =
    position === 1
      ? "1st Place!"
      : position === 2
      ? "2nd Place!"
      : position === 3
      ? "3rd Place!"
      : `${position}th Place`;

  const positionColor =
    position === 1
      ? "text-yellow-400"
      : position === 2
      ? "text-gray-300"
      : position === 3
      ? "text-amber-600"
      : "text-muted-foreground";

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
      data-testid="race-results"
    >
      <div className="bg-card rounded-xl p-6 md:p-8 max-w-lg w-full border border-card-border animate-slide-up">
        <div className="text-center mb-6">
          <h2 className="text-lg text-muted-foreground mb-2">Race Complete!</h2>
          <div className={cn("text-4xl md:text-5xl font-bold font-display", positionColor)}>
            {positionText}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <ResultStat label="WPM" value={stats.wpm} highlight />
          <ResultStat label="Accuracy" value={`${stats.accuracy}%`} />
          <ResultStat label="Time" value={formatTime(raceTime)} />
          <ResultStat label="Position" value={`${position}/${totalPlayers}`} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover-elevate active-elevate-2 transition-all"
            data-testid="button-play-again"
          >
            Race Again
          </button>
          <button
            onClick={onGoHome}
            className="flex-1 bg-muted text-muted-foreground py-3 rounded-lg font-semibold hover-elevate active-elevate-2 transition-all"
            data-testid="button-go-home"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </div>
      <div
        className={cn(
          "text-xl md:text-2xl font-bold",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
