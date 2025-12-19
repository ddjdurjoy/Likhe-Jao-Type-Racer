import React from "react";

interface LobbyPlayer {
  id: string;
  name: string;
  avatar?: string;
  ready?: boolean;
  isHost?: boolean;
}

export function LobbyPanel({
  roomCode,
  players,
  isHost,
  onStartWithBots,
  onStartAnyway,
  canStartAnyway,
  waitingCount,
}: {
  roomCode: string;
  players: LobbyPlayer[];
  isHost: boolean;
  onStartWithBots: () => void;
  onStartAnyway: () => void;
  canStartAnyway: boolean;
  waitingCount: number;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-background/80 backdrop-blur-md shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Waiting Room</h2>
            <p className="text-sm text-muted-foreground">Room code: <span className="font-mono tracking-wider">{roomCode}</span></p>
          </div>
          <div className="text-sm text-muted-foreground">{players.length}/5 players</div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
                {p.avatar ? <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover" /> : (p.name?.[0] ?? "P")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.isHost ? "Host" : (p.ready ? "Ready" : "Not ready")}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-muted-foreground">Waiting for players... ({waitingCount} more)</div>
          <div className="flex items-center gap-2">
            <button onClick={onStartAnyway} disabled={!canStartAnyway} className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50">
              Start now
            </button>
            {isHost && (
              <button onClick={onStartWithBots} className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
                Start now with bots
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
