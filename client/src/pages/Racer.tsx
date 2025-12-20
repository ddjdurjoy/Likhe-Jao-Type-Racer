import { useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CarPreview } from "@/components/game/Car";
import { CARS } from "@/lib/stores/gameStore";

type PublicRacer = {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  selectedCar: number;
  stats: {
    totalRaces?: number | null;
    wins?: number | null;
    avgWpm?: number | null;
    bestWpm?: number | null;
    accuracy?: number | null;
    totalWords?: number | null;
    playTimeSeconds?: number | null;
  } | null;
  unlockedCars: number[];
};

export default function RacerProfilePage() {
  const [, params] = useRoute("/racer/:username");
  const username = params?.username || "";

  const queryKey = useMemo(() => ["/api/racer", username], [username]);

  const racer = useQuery<PublicRacer>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/racer/${encodeURIComponent(username)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to load racer (${res.status})`);
      }
      return res.json();
    },
    enabled: !!username,
    retry: false,
  });

  const carsOwned = useMemo(() => {
    const set = new Set(racer.data?.unlockedCars || []);
    return CARS.filter((c) => set.has(c.id));
  }, [racer.data?.unlockedCars]);

  if (racer.isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (racer.isError) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Racer not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{(racer.error as any)?.message || "Failed to load"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Missing username</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Open a racer profile like /racer/&lt;username&gt;.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!racer.data) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Loading racer...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Please wait.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = racer.data.stats;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {racer.data.avatarUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={racer.data.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                {racer.data.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span>{racer.data.username}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {racer.data.bio ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{racer.data.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No bio yet.</p>
          )}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Selected car</span>
            <CarPreview carId={racer.data.selectedCar ?? 0} size="sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Races" value={s?.totalRaces ?? 0} />
            <Stat label="Wins" value={s?.wins ?? 0} />
            <Stat label="Avg WPM" value={Math.round(s?.avgWpm ?? 0)} />
            <Stat label="Best WPM" value={Math.round(s?.bestWpm ?? 0)} />
            <Stat label="Accuracy" value={`${Math.round((s?.accuracy ?? 0) * 10) / 10}%`} />
            <Stat label="Words" value={s?.totalWords ?? 0} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cars owned</CardTitle>
        </CardHeader>
        <CardContent>
          {carsOwned.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {carsOwned.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-2 p-2 rounded border border-border">
                  <CarPreview carId={c.id} size="md" />
                  <div className="text-xs text-muted-foreground text-center">{c.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No cars unlocked yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 rounded bg-muted/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
