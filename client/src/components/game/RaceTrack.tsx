import { useGameStore } from "@/lib/stores/gameStore";
import { Car } from "./Car";

export function RaceTrack() {
  const { players, raceState } = useGameStore();
  const isRacing = raceState === "racing";

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.finished && b.finished) return a.position - b.position;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress;
  });

  sortedPlayers.forEach((player, index) => {
    const originalPlayer = players.find((p) => p.id === player.id);
    if (originalPlayer) {
      originalPlayer.position = index + 1;
    }
  });

  return (
    <div
      className="relative w-full h-full bg-track rounded-lg overflow-hidden"
      data-testid="race-track"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-track/50 to-transparent" />

      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-muted to-transparent flex flex-col justify-around py-4">
        <div className="text-xs font-medium text-muted-foreground text-center">
          START
        </div>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-3 bg-track-finish flex items-center justify-center">
        <div className="h-full w-full flex flex-col">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 ${i % 2 === 0 ? "bg-white" : "bg-black"}`}
            />
          ))}
        </div>
      </div>

      <div className="absolute right-6 top-0 bottom-0 w-px bg-track-finish/50" />
      <div className="absolute right-10 top-0 bottom-0 w-px bg-track-finish/30" />

      {[0, 1, 2, 3].map((lane) => (
        <div
          key={lane}
          className="absolute left-12 right-8 border-b border-dashed border-muted-foreground/20"
          style={{ top: `${(lane + 1) * 25}%` }}
        />
      ))}

      <div className="absolute inset-0 left-16 right-12">
        {players.map((player, index) => (
          <Car
            key={player.id}
            carId={player.carId}
            progress={player.progress}
            playerName={player.name}
            isPlayer={!player.isAI}
            isAI={player.isAI}
            position={player.position}
            lane={index}
            isRacing={isRacing}
          />
        ))}
      </div>

      <div className="absolute bottom-2 right-4 flex items-center gap-2">
        {[1, 2, 3].map((pos) => (
          <div
            key={pos}
            className="flex items-center gap-1 text-xs text-muted-foreground"
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                pos === 1
                  ? "bg-yellow-400 text-yellow-900"
                  : pos === 2
                  ? "bg-gray-300 text-gray-700"
                  : "bg-amber-600 text-amber-100"
              }`}
            >
              {pos}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
