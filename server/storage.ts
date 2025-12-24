import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  PlayerStats,
  InsertPlayerStats,
  RaceResult,
  InsertRaceResult,
  LeaderboardEntry,
  PracticeResult,
  InsertPracticeResult,
} from "@shared/schema";

export interface IStorage {
  // auth
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithAuth(data: { username: string; passwordHash: string; email?: string | null }): Promise<User>;
  setEmailVerification(userId: string, token: string, expiresAt: Date): Promise<void>;
  verifyEmailToken(token: string): Promise<User | undefined>;

  // friends
  searchUsers(q: string, limit?: number): Promise<User[]>;
  createFriendRequest(fromUserId: string, toUserId: string): Promise<void>;
  listFriendRequests(userId: string): Promise<any[]>;
  respondFriendRequest(requestId: string, accept: boolean): Promise<void>;
  listFriends(userId: string): Promise<User[]>;
  removeFriend(userId: string, friendUserId: string): Promise<void>;


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

  // practice leaderboard
  createPracticeResult(result: InsertPracticeResult): Promise<PracticeResult>;
  getPracticeBest(opts: {
    userId: string;
    timeSeconds: number;
    language: "en" | "bn";
  }): Promise<PracticeResult | undefined>;
  getPracticeLeaderboard(opts: {
    limit: number;
    timeSeconds: number;
    country: string;
    language: string;
  }): Promise<
    Array<{
      rank: number;
      username: string;
      wpm: number;
      rawWpm: number;
      accuracy: number;
      consistency: number;
      errors: number;
      timeSeconds: number;
      country: string | null;
    }>
  >;
}

export class MemStorage implements IStorage {
  private friendRequests: Map<string, any>;
  private friends: Map<string, any>;
  private users: Map<string, User>;
  private playerStats: Map<string, PlayerStats>;
  private raceResults: Map<string, RaceResult>;
  private practiceResults: Map<string, PracticeResult>;

  constructor() {
    this.users = new Map();
    this.playerStats = new Map();
    this.raceResults = new Map();
    this.practiceResults = new Map();
    this.friendRequests = new Map();
    this.friends = new Map();
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
        displayName: null as any,
        firstName: null as any,
        lastName: null as any,
        avatarUrl: null as any,
        bio: null as any,
        avatarVisibility: "public" as any,
        bioVisibility: "public" as any,
        selectedCar: index % 5,
        theme: "dark",
        language: "en",
        soundEnabled: 1,
        volume: 80,
      } as any);

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

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
  }

  async createUserWithAuth(data: { username: string; passwordHash: string; email?: string | null }): Promise<User> {
    const id = randomUUID();
    const user: any = {
      id,
      username: data.username,
      displayName: null,
      firstName: null,
      lastName: null,
      passwordHash: data.passwordHash,
      email: data.email ?? null,
      emailVerifiedAt: null,
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,
      avatarUrl: null,
      bio: null,
      avatarVisibility: "public",
      bioVisibility: "public",
      selectedCar: 0,
      theme: "dark",
      language: "en",
      soundEnabled: 1,
      volume: 80,
    };
    this.users.set(id, user);
    await this.createPlayerStats({
      userId: id,
      totalRaces: 0,
      wins: 0,
      avgWpm: 0,
      bestWpm: 0,
      accuracy: 0,
      totalWords: 0,
      playTimeSeconds: 0,
    });
    return user;
  }

  async setEmailVerification(userId: string, token: string, expiresAt: Date): Promise<void> {
    const u: any = this.users.get(userId);
    if (!u) return;
    u.emailVerifyToken = token;
    u.emailVerifyTokenExpiresAt = expiresAt;
    this.users.set(userId, u);
  }

  async verifyEmailToken(token: string): Promise<User | undefined> {
    const now = Date.now();
    const u: any = Array.from(this.users.values()).find((x: any) => x.emailVerifyToken === token);
    if (!u) return undefined;
    const exp = u.emailVerifyTokenExpiresAt ? new Date(u.emailVerifyTokenExpiresAt).getTime() : 0;
    if (exp && exp < now) return undefined;
    u.emailVerifiedAt = new Date();
    u.emailVerifyToken = null;
    u.emailVerifyTokenExpiresAt = null;
    this.users.set(u.id, u);
    return u;
  }

  async searchUsers(q: string, limit = 20): Promise<User[]> {
    const s = q.toLowerCase();
    return Array.from(this.users.values()).filter((u: any) => u.username.toLowerCase().includes(s)).slice(0, limit);
  }

  async createFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    const existing = Array.from(this.friendRequests.values()).find((r: any) => r.fromUserId === fromUserId && r.toUserId === toUserId && r.status === 'pending');
    if (existing) return;
    const id = randomUUID();
    this.friendRequests.set(id, { id, fromUserId, toUserId, status: 'pending', createdAt: new Date(), respondedAt: null });
  }

  async listFriendRequests(userId: string): Promise<any[]> {
    return Array.from(this.friendRequests.values()).filter((r: any) => r.toUserId === userId && r.status === 'pending');
  }

  async respondFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const r: any = this.friendRequests.get(requestId);
    if (!r) return;
    r.status = accept ? 'accepted' : 'declined';
    r.respondedAt = new Date();
    this.friendRequests.set(requestId, r);
    if (accept) {
      const id1 = randomUUID();
      const id2 = randomUUID();
      this.friends.set(id1, { id: id1, userId: r.fromUserId, friendUserId: r.toUserId, createdAt: new Date() });
      this.friends.set(id2, { id: id2, userId: r.toUserId, friendUserId: r.fromUserId, createdAt: new Date() });
    }
  }

  async listFriends(userId: string): Promise<User[]> {
    const rel = Array.from(this.friends.values()).filter((f: any) => f.userId === userId);
    const ids = rel.map((f: any) => f.friendUserId);
    return ids.map((id: string) => this.users.get(id)).filter(Boolean) as any;
  }

  async removeFriend(userId: string, friendUserId: string): Promise<void> {
    for (const [id, f] of Array.from(this.friends.entries())) {
      const ff: any = f;
      if ((ff.userId === userId && ff.friendUserId === friendUserId) || (ff.userId === friendUserId && ff.friendUserId === userId)) {
        this.friends.delete(id);
      }
    }
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
      displayName: null as any,
      firstName: null as any,
      lastName: null as any,
      // auth fields (nullable)
      passwordHash: null,
      email: null,
      emailVerifiedAt: null,
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,

      // public profile
      avatarUrl: null,
      bio: null,
      avatarVisibility: "public" as any,
      bioVisibility: "public" as any,

      selectedCar: insertUser.selectedCar ?? 0,
      theme: insertUser.theme ?? "dark",
      language: insertUser.language ?? "en",
      soundEnabled: insertUser.soundEnabled ?? 1,
      volume: insertUser.volume ?? 80,
    } as any;
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

  async createPracticeResult(insertResult: InsertPracticeResult): Promise<PracticeResult> {
    const id = randomUUID();
    const result: PracticeResult = {
      id,
      userId: (insertResult as any).userId,
      mode: (insertResult as any).mode,
      timeSeconds: (insertResult as any).timeSeconds,
      wpm: (insertResult as any).wpm,
      rawWpm: (insertResult as any).rawWpm,
      accuracy: (insertResult as any).accuracy,
      consistency: (insertResult as any).consistency,
      errors: (insertResult as any).errors,
      language: (insertResult as any).language,
      createdAt: new Date(),
    } as any;
    this.practiceResults.set(id, result);
    return result;
  }

  async getPracticeBest(opts: {
    userId: string;
    timeSeconds: number;
    language: "en" | "bn";
  }): Promise<PracticeResult | undefined> {
    const all = Array.from(this.practiceResults.values()).filter(
      (r) =>
        r.userId === opts.userId &&
        r.mode === "time" &&
        r.timeSeconds === opts.timeSeconds &&
        r.language === opts.language
    );
    all.sort((a, b) => (b.wpm ?? 0) - (a.wpm ?? 0));
    return all[0];
  }

  async getPracticeLeaderboard(opts: {
    limit: number;
    timeSeconds: number;
    country: string;
    language: string;
  }): Promise<
    Array<{
      rank: number;
      username: string;
      wpm: number;
      rawWpm: number;
      accuracy: number;
      consistency: number;
      errors: number;
      timeSeconds: number;
      country: string | null;
    }>
  > {
    const { limit, timeSeconds, country, language } = opts;

    // best WPM per user for this bucket
    const bestByUser = new Map<
      string,
      { wpm: number; rawWpm: number; accuracy: number; consistency: number; errors: number }
    >();

    for (const r of this.practiceResults.values()) {
      if ((r as any).mode !== "time") continue;
      if ((r as any).timeSeconds !== timeSeconds) continue;
      if ((r as any).language !== language) continue;

      const user = await this.getUser((r as any).userId);
      const userCountry = (user as any)?.country ? String((user as any).country).toUpperCase() : null;
      if (!userCountry || userCountry !== country.toUpperCase()) continue;

      const prev = bestByUser.get((r as any).userId);
      if (!prev || (r as any).wpm > prev.wpm) {
        bestByUser.set((r as any).userId, {
          wpm: (r as any).wpm,
          rawWpm: (r as any).rawWpm,
          accuracy: (r as any).accuracy,
          consistency: (r as any).consistency,
          errors: (r as any).errors,
        });
      }
    }

    const rows: Array<any> = [];
    for (const [userId, best] of bestByUser.entries()) {
      const user = await this.getUser(userId);
      rows.push({
        userId,
        username: user?.username || "Unknown",
        ...best,
      });
    }

    rows.sort((a, b) => b.wpm - a.wpm);

    return rows.slice(0, limit).map((r, i) => ({
      rank: i + 1,
      username: r.username,
      wpm: Math.round(r.wpm),
      rawWpm: Math.round(r.rawWpm),
      accuracy: Math.round(r.accuracy * 10) / 10,
      consistency: Math.round(r.consistency * 10) / 10,
      errors: r.errors,
      timeSeconds,
      country: country.toUpperCase(),
    }));
  }
}

// Choose DB-backed storage when DATABASE_URL is available
import { PgStorage } from "./pgStorage";

export const storage = process.env.DATABASE_URL ? new PgStorage() : new MemStorage();

// Safe startup log (no secrets)
console.log(`[storage] Using ${process.env.DATABASE_URL ? "PgStorage (Postgres)" : "MemStorage"}`);
