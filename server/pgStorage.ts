import { randomUUID } from "crypto";
import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "./db";

function requireDb() {
  if (!db) throw new Error("Database not initialized. Set DATABASE_URL.");
  return db;
}
import {
  users,
  playerStats,
  raceResults,
  friends,
  friendRequests,
  type User,
  type InsertRaceResult,
  type RaceResult,
  type LeaderboardEntry,
  type PlayerStats,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class PgStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const d = requireDb();
    const [u] = await d.select().from(users).where(eq(users.id, id));
    return u as any;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const d = requireDb();
    const [u] = await d.select().from(users).where(eq(users.username, username));
    return u as any;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const d = requireDb();
    const [u] = await d.select().from(users).where(eq(users.email, email));
    return u as any;
  }

  async createUser(insertUser: any): Promise<User> {
    const d = requireDb();
    const id = randomUUID();
    const [u] = await d.insert(users).values({ id, ...insertUser }).returning();
    return u as any;
  }

  async createUserWithAuth(data: { username: string; passwordHash: string; email?: string | null }): Promise<User> {
    const id = randomUUID();
    const d = requireDb();
    const [u] = await d
      .insert(users)
      .values({
        id,
        username: data.username,
        passwordHash: data.passwordHash,
        email: data.email ?? null,
        emailVerifiedAt: null,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
        displayName: null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        bio: null,
        avatarVisibility: "public",
        bioVisibility: "public",
        selectedCar: 0,
        theme: "dark",
        language: "en",
        soundEnabled: 1,
        volume: 80,
      })
      .returning();

    await d.insert(playerStats).values({
      id: randomUUID(),
      userId: id,
      totalRaces: 0,
      wins: 0,
      avgWpm: 0,
      bestWpm: 0,
      accuracy: 0,
      totalWords: 0,
      playTimeSeconds: 0,
    });

    return u as any;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const d = requireDb();
    const [u] = await d.update(users).set(updates as any).where(eq(users.id, id)).returning();
    return u as any;
  }

  async setEmailVerification(userId: string, token: string, expiresAt: Date): Promise<void> {
    const d = requireDb();
    await d
      .update(users)
      .set({ emailVerifyToken: token, emailVerifyTokenExpiresAt: expiresAt } as any)
      .where(eq(users.id, userId));
  }

  async verifyEmailToken(token: string): Promise<User | undefined> {
    const d = requireDb();
    const [u] = await d.select().from(users).where(eq(users.emailVerifyToken, token));
    if (!u) return undefined;
    const exp = (u as any).emailVerifyTokenExpiresAt ? new Date((u as any).emailVerifyTokenExpiresAt).getTime() : 0;
    if (exp && exp < Date.now()) return undefined;
    const [updated] = await d
      .update(users)
      .set({ emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyTokenExpiresAt: null } as any)
      .where(eq(users.id, (u as any).id))
      .returning();
    return updated as any;
  }

  async getPlayerStats(userId: string): Promise<PlayerStats | undefined> {
    const d = requireDb();
    const [s] = await d.select().from(playerStats).where(eq(playerStats.userId, userId));
    return s as any;
  }

  async createPlayerStats(stats: any): Promise<PlayerStats> {
    const d = requireDb();
    const id = randomUUID();
    const [s] = await d.insert(playerStats).values({ id, ...stats }).returning();
    return s as any;
  }

  async updatePlayerStats(userId: string, updates: Partial<PlayerStats>): Promise<PlayerStats | undefined> {
    const d = requireDb();
    const [s] = await d.update(playerStats).set(updates as any).where(eq(playerStats.userId, userId)).returning();
    return s as any;
  }

  async getRaceResults(userId: string, limit = 50): Promise<RaceResult[]> {
    const d = requireDb();
    const rows = await d.select().from(raceResults).where(eq(raceResults.oderId, userId)).limit(limit);
    return rows as any;
  }

  async createRaceResult(result: InsertRaceResult): Promise<RaceResult> {
    const d = requireDb();
    const id = randomUUID();
    const [r] = await d.insert(raceResults).values({ id, ...result } as any).returning();
    return r as any;
  }

  async getAllRaceResults(limit = 100): Promise<RaceResult[]> {
    const d = requireDb();
    const rows = await d.select().from(raceResults).limit(limit);
    return rows as any;
  }

  async getLeaderboard(limit = 50, period: "all" | "weekly" | "daily" = "all"): Promise<LeaderboardEntry[]> {
    const d = requireDb();
    // Simple leaderboard based on avgWpm from playerStats
    const rows = await d.select().from(playerStats).limit(limit);
    const enriched = await Promise.all(
      rows.map(async (s: any) => {
        const u = await this.getUser(s.userId);
        return { ...s, username: u?.username || "Unknown" };
      })
    );
    const sorted = enriched.sort((a, b) => (b.avgWpm ?? 0) - (a.avgWpm ?? 0)).slice(0, limit);
    return sorted.map((s: any, idx: number) => ({
      rank: idx + 1,
      username: s.username,
      wpm: Math.round(s.avgWpm ?? 0),
      accuracy: Math.round((s.accuracy ?? 0) * 10) / 10,
      races: s.totalRaces ?? 0,
      wins: s.wins ?? 0,
    }));
  }

  async searchUsers(q: string, limit = 20): Promise<User[]> {
    const d = requireDb();
    const rows = await d
      .select()
      .from(users)
      .where(ilike(users.username, `%${q}%`))
      .limit(limit);
    return rows as any;
  }

  async createFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    const d = requireDb();
    await d.insert(friendRequests).values({
      id: randomUUID(),
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: new Date(),
    } as any);
  }

  async listFriendRequests(userId: string): Promise<any[]> {
    const d = requireDb();
    const rows = await d.select().from(friendRequests).where(and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, "pending")));
    return rows as any;
  }

  async respondFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const d = requireDb();
    const [req] = await d.select().from(friendRequests).where(eq(friendRequests.id, requestId));
    if (!req) return;

    await d.update(friendRequests).set({ status: accept ? "accepted" : "declined", respondedAt: new Date() } as any).where(eq(friendRequests.id, requestId));

    if (accept) {
      await d.insert(friends).values({ id: randomUUID(), userId: (req as any).fromUserId, friendUserId: (req as any).toUserId, createdAt: new Date() } as any);
      await d.insert(friends).values({ id: randomUUID(), userId: (req as any).toUserId, friendUserId: (req as any).fromUserId, createdAt: new Date() } as any);
    }
  }

  async listFriends(userId: string): Promise<User[]> {
    const d = requireDb();
    const rel = await d.select().from(friends).where(eq(friends.userId, userId));
    const friendIds = rel.map((r: any) => r.friendUserId);
    if (!friendIds.length) return [];
    const rows = await d.select().from(users).where(or(...friendIds.map((id) => eq(users.id, id))));
    return rows as any;
  }

  async removeFriend(userId: string, friendUserId: string): Promise<void> {
    const d = requireDb();
    await d.delete(friends).where(and(eq(friends.userId, userId), eq(friends.friendUserId, friendUserId)));
    await d.delete(friends).where(and(eq(friends.userId, friendUserId), eq(friends.friendUserId, userId)));
  }
}
