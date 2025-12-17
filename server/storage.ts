import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  PlayerStats,
  InsertPlayerStats,
  RaceResult,
  InsertRaceResult,
  LeaderboardEntry,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getPlayerStats(userId: string): Promise<PlayerStats | undefined>;
  createPlayerStats(stats: InsertPlayerStats): Promise<PlayerStats>;
  updatePlayerStats(userId: string, updates: Partial<PlayerStats>): Promise<PlayerStats | undefined>;

  getRaceResults(userId: string, limit?: number): Promise<RaceResult[]>;
  createRaceResult(result: InsertRaceResult): Promise<RaceResult>;
  getAllRaceResults(limit?: number): Promise<RaceResult[]>;

  getLeaderboard(limit?: number, period?: "all" | "weekly" | "daily"): Promise<LeaderboardEntry[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private playerStats: Map<string, PlayerStats>;
  private raceResults: Map<string, RaceResult>;

  constructor() {
    this.users = new Map();
    this.playerStats = new Map();
    this.raceResults = new Map();
    this.seedLeaderboard();
  }

  private seedLeaderboard() {
    const mockPlayers = [
      { username: "SpeedKing", wpm: 105, accuracy: 98.2, races: 234, wins: 189 },
      { username: "TypeMaster", wpm: 98, accuracy: 97.5, races: 312, wins: 178 },
      { username: "FlashFingers", wpm: 92, accuracy: 96.8, races: 189, wins: 124 },
      { username: "QuickType", wpm: 88, accuracy: 95.4, races: 156, wins: 98 },
      { username: "RacerPro", wpm: 85, accuracy: 94.9, races: 278, wins: 145 },
      { username: "KeyboardNinja", wpm: 82, accuracy: 94.2, races: 134, wins: 67 },
      { username: "SwiftWriter", wpm: 79, accuracy: 93.8, races: 201, wins: 89 },
      { username: "TypingAce", wpm: 76, accuracy: 92.5, races: 167, wins: 72 },
      { username: "SpeedDemon", wpm: 74, accuracy: 91.9, races: 145, wins: 58 },
      { username: "FastLane", wpm: 71, accuracy: 90.3, races: 123, wins: 45 },
    ];

    mockPlayers.forEach((player, index) => {
      const id = `mock-${index}`;
      this.users.set(id, {
        id,
        username: player.username,
        selectedCar: index % 5,
        theme: "dark",
        language: "en",
        soundEnabled: 1,
        volume: 80,
      });

      this.playerStats.set(id, {
        id: `stats-${index}`,
        userId: id,
        totalRaces: player.races,
        wins: player.wins,
        avgWpm: player.wpm,
        bestWpm: player.wpm + Math.floor(Math.random() * 15),
        accuracy: player.accuracy,
        totalWords: player.races * 20,
        playTimeSeconds: player.races * 45,
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      selectedCar: insertUser.selectedCar ?? 0,
      theme: insertUser.theme ?? "dark",
      language: insertUser.language ?? "en",
      soundEnabled: insertUser.soundEnabled ?? 1,
      volume: insertUser.volume ?? 80,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getPlayerStats(userId: string): Promise<PlayerStats | undefined> {
    return Array.from(this.playerStats.values()).find(
      (stats) => stats.userId === userId
    );
  }

  async createPlayerStats(insertStats: InsertPlayerStats): Promise<PlayerStats> {
    const id = randomUUID();
    const stats: PlayerStats = {
      id,
      userId: insertStats.userId,
      totalRaces: insertStats.totalRaces ?? 0,
      wins: insertStats.wins ?? 0,
      avgWpm: insertStats.avgWpm ?? 0,
      bestWpm: insertStats.bestWpm ?? 0,
      accuracy: insertStats.accuracy ?? 0,
      totalWords: insertStats.totalWords ?? 0,
      playTimeSeconds: insertStats.playTimeSeconds ?? 0,
    };
    this.playerStats.set(id, stats);
    return stats;
  }

  async updatePlayerStats(
    userId: string,
    updates: Partial<PlayerStats>
  ): Promise<PlayerStats | undefined> {
    const existing = Array.from(this.playerStats.entries()).find(
      ([, stats]) => stats.userId === userId
    );

    if (!existing) return undefined;

    const [key, stats] = existing;
    const updatedStats = { ...stats, ...updates };
    this.playerStats.set(key, updatedStats);
    return updatedStats;
  }

  async getRaceResults(userId: string, limit = 50): Promise<RaceResult[]> {
    return Array.from(this.raceResults.values())
      .filter((result) => result.oderId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async createRaceResult(insertResult: InsertRaceResult): Promise<RaceResult> {
    const id = randomUUID();
    const result: RaceResult = {
      id,
      oderId: insertResult.oderId,
      wpm: insertResult.wpm,
      accuracy: insertResult.accuracy,
      position: insertResult.position,
      language: insertResult.language,
      difficulty: insertResult.difficulty,
      wordsTyped: insertResult.wordsTyped,
      raceTime: insertResult.raceTime,
      createdAt: new Date(),
    };
    this.raceResults.set(id, result);
    return result;
  }

  async getAllRaceResults(limit = 100): Promise<RaceResult[]> {
    return Array.from(this.raceResults.values())
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getLeaderboard(
    limit = 50,
    period: "all" | "weekly" | "daily" = "all"
  ): Promise<LeaderboardEntry[]> {
    const allStats = Array.from(this.playerStats.values());

    const enrichedStats = await Promise.all(
      allStats.map(async (stats) => {
        const user = await this.getUser(stats.userId);
        return {
          ...stats,
          username: user?.username || "Unknown",
        };
      })
    );

    const sorted = enrichedStats
      .sort((a, b) => (b.avgWpm ?? 0) - (a.avgWpm ?? 0))
      .slice(0, limit);

    return sorted.map((stats, index) => ({
      rank: index + 1,
      username: stats.username,
      wpm: Math.round(stats.avgWpm ?? 0),
      accuracy: Math.round((stats.accuracy ?? 0) * 10) / 10,
      races: stats.totalRaces ?? 0,
      wins: stats.wins ?? 0,
    }));
  }
}

export const storage = new MemStorage();
