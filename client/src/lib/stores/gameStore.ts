import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, Player, RaceState, Language, Difficulty, RaceConfig, Car, Theme } from "@shared/schema";

interface GameStore {
  raceState: RaceState;
  players: Player[];
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  startTime: number | null;
  endTime: number | null;
  countdown: number;
  language: Language;
  difficulty: Difficulty;
  theme: Theme;
  soundEnabled: boolean;
  volume: number;
  selectedCarId: number;
  weather: 'none' | 'rain' | 'snow' | 'leaf' | 'flower';
  username: string;
  totalRaces: number;
  totalWins: number;
  bestWpm: number;
  avgWpm: number;
  totalAccuracy: number;
  unlockedCars: number[];
  unlockedAchievements: string[];

  setRaceState: (state: RaceState) => void;
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  setWords: (words: string[]) => void;
  setCurrentWordIndex: (index: number) => void;
  setCurrentCharIndex: (index: number) => void;
  setStartTime: (time: number | null) => void;
  setEndTime: (time: number | null) => void;
  setCountdown: (count: number) => void;
  setLanguage: (lang: Language) => void;
  setWeather: (w: 'none' | 'rain' | 'snow' | 'leaf' | 'flower') => void;
  setDifficulty: (diff: Difficulty) => void;
  setTheme: (theme: Theme) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (vol: number) => void;
  setSelectedCarId: (id: number) => void;
  setUsername: (name: string) => void;
  recordRaceResult: (wpm: number, accuracy: number, won: boolean) => void;
  unlockCar: (carId: number) => void;
  unlockAchievement: (achievementId: string) => void;
  resetRace: () => void;
  initRace: (config: RaceConfig, words: string[]) => void;
}

const defaultState = {
  raceState: "waiting" as RaceState,
  players: [],
  words: [],
  currentWordIndex: 0,
  currentCharIndex: 0,
  startTime: null,
  endTime: null,
  countdown: 3,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      language: "en",
      difficulty: "medium",
      theme: "dark",
      soundEnabled: true,
      volume: 80,
      selectedCarId: 0,
      weather: 'none',
      username: "",
      totalRaces: 0,
      totalWins: 0,
      bestWpm: 0,
      avgWpm: 0,
      totalAccuracy: 0,
      unlockedCars: [0, 1],
      unlockedAchievements: [],

      setRaceState: (raceState) => set({ raceState }),
      setPlayers: (players) => set({ players }),
      updatePlayer: (id, updates) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      setWords: (words) => set({ words }),
      setCurrentWordIndex: (currentWordIndex) => set({ currentWordIndex }),
      setCurrentCharIndex: (currentCharIndex) => set({ currentCharIndex }),
      setStartTime: (startTime) => set({ startTime }),
      setEndTime: (endTime) => set({ endTime }),
      setCountdown: (countdown) => set({ countdown }),
      setLanguage: (language) => set({ language }),
      setWeather: (weather) => set({ weather }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setTheme: (theme) => set({ theme }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setVolume: (volume) => set({ volume }),
      setSelectedCarId: (selectedCarId) => set({ selectedCarId }),
      setUsername: (username) => set({ username }),

      recordRaceResult: (wpm, accuracy, won) =>
        set((state) => {
          const newTotalRaces = state.totalRaces + 1;
          const newTotalWins = won ? state.totalWins + 1 : state.totalWins;
          const newBestWpm = Math.max(state.bestWpm, wpm);
          const newAvgWpm =
            (state.avgWpm * state.totalRaces + wpm) / newTotalRaces;
          const newTotalAccuracy =
            (state.totalAccuracy * state.totalRaces + accuracy) / newTotalRaces;

          return {
            totalRaces: newTotalRaces,
            totalWins: newTotalWins,
            bestWpm: newBestWpm,
            avgWpm: newAvgWpm,
            totalAccuracy: newTotalAccuracy,
          };
        }),

      unlockCar: (carId) =>
        set((state) => ({
          unlockedCars: state.unlockedCars.includes(carId)
            ? state.unlockedCars
            : [...state.unlockedCars, carId],
        })),

      unlockAchievement: (achievementId) =>
        set((state) => ({
          unlockedAchievements: state.unlockedAchievements.includes(achievementId)
            ? state.unlockedAchievements
            : [...state.unlockedAchievements, achievementId],
        })),

      resetRace: () => set(defaultState),

      initRace: (config, words) => {
        const { username, selectedCarId } = get();
        const player: Player = {
          id: "player",
          name: username || "Player",
          carId: selectedCarId,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          position: 0,
          isAI: false,
        };

        const aiNames = ["Speedy", "Steady", "Rookie", "Flash"];
        const aiDifficulties: Array<"rookie" | "steady" | "speedy"> = [
          "speedy",
          "steady",
          "rookie",
          "steady",
        ];
        const aiPlayers: Player[] = [];

        for (let i = 0; i < config.aiOpponents; i++) {
          aiPlayers.push({
            id: `ai-${i}`,
            name: aiNames[i] || `Bot ${i + 1}`,
            carId: (i + 2) % 5,
            progress: 0,
            wpm: 0,
            accuracy: 95 + Math.random() * 5,
            finished: false,
            position: 0,
            isAI: true,
            aiDifficulty: aiDifficulties[i] || "steady",
          });
        }

        set({
          ...defaultState,
          words,
          players: [player, ...aiPlayers],
          raceState: "countdown",
          countdown: 3,
        });
      },
    }),
    {
      name: "likhe-jao-game-store",
      partialize: (state) => ({
        language: state.language,
        difficulty: state.difficulty,
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        volume: state.volume,
        selectedCarId: state.selectedCarId,
        weather: state.weather,
        username: state.username,
        totalRaces: state.totalRaces,
        totalWins: state.totalWins,
        bestWpm: state.bestWpm,
        avgWpm: state.avgWpm,
        totalAccuracy: state.totalAccuracy,
        unlockedCars: state.unlockedCars,
        unlockedAchievements: state.unlockedAchievements,
      }),
    }
  )
);

export const CARS: Car[] = [
  { id: 0, name: "Street Racer", color: "#ef4444", unlocked: true },
  { id: 1, name: "Thunder Bolt", color: "#3b82f6", unlocked: true },
  { id: 2, name: "Golden Flash", color: "#eab308", unlocked: false },
  { id: 3, name: "Shadow Rider", color: "#6366f1", unlocked: false },
  { id: 4, name: "Neon Beast", color: "#22c55e", unlocked: false },
  { id: 5, name: "Crimson Comet", color: "#dc2626", unlocked: false },
  { id: 6, name: "Azure Arrow", color: "#0ea5e9", unlocked: false },
  { id: 7, name: "Violet Viper", color: "#8b5cf6", unlocked: false },
  { id: 8, name: "Emerald Edge", color: "#10b981", unlocked: false },
  { id: 9, name: "Cyber Glide", color: "#14b8a6", unlocked: false },
];
