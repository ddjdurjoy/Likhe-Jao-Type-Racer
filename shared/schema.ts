import { pgTable, text, varchar, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  selectedCar: integer("selected_car").default(0),
  theme: text("theme").default("dark"),
  language: text("language").default("en"),
  soundEnabled: integer("sound_enabled").default(1),
  volume: integer("volume").default(80),
});

export const playerStats = pgTable("player_stats", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  totalRaces: integer("total_races").default(0),
  wins: integer("wins").default(0),
  avgWpm: real("avg_wpm").default(0),
  bestWpm: real("best_wpm").default(0),
  accuracy: real("accuracy").default(0),
  totalWords: integer("total_words").default(0),
  playTimeSeconds: integer("play_time_seconds").default(0),
});

export const raceResults = pgTable("race_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  oderId: varchar("user_id", { length: 36 }).notNull(),
  wpm: real("wpm").notNull(),
  accuracy: real("accuracy").notNull(),
  position: integer("position").notNull(),
  language: text("language").notNull(),
  difficulty: text("difficulty").notNull(),
  wordsTyped: integer("words_typed").notNull(),
  raceTime: real("race_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({ id: true });
export const insertRaceResultSchema = createInsertSchema(raceResults).omit({ id: true, createdAt: true });
export const insertAchievementSchema = createInsertSchema(achievements).omit({ id: true, unlockedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type PlayerStats = typeof playerStats.$inferSelect;
export type InsertRaceResult = z.infer<typeof insertRaceResultSchema>;
export type RaceResult = typeof raceResults.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

export type Language = "en" | "bn";
export type Difficulty = "easy" | "medium" | "hard";
export type RaceState = "waiting" | "countdown" | "racing" | "finished";
export type Theme = "light" | "dark" | "neon" | "sunset";

export interface Car {
  id: number;
  name: string;
  color: string;
  unlocked: boolean;
}

export interface Player {
  id: string;
  name: string;
  carId: number;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  position: number;
  isAI: boolean;
  aiDifficulty?: "rookie" | "steady" | "speedy";
}

export interface RaceConfig {
  language: Language;
  difficulty: Difficulty;
  wordCount: number;
  aiOpponents: number;
}

export interface GameState {
  raceState: RaceState;
  players: Player[];
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  startTime: number | null;
  endTime: number | null;
  countdown: number;
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  correctChars: number;
  totalChars: number;
  progress: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wpm: number;
  accuracy: number;
  races: number;
  wins: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "speed" | "accuracy" | "milestone" | "special";
  requirement: number;
}
