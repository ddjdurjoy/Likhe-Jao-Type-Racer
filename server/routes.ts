import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertRaceResultSchema } from "@shared/schema";
import { z } from "zod";

import { registerAuthRoutes } from "./authRoutes";
import { registerPracticeLeaderboardRoutes } from "./practiceLeaderboardRoutes";
import { registerRoomRoutes } from "./roomRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  registerPracticeLeaderboardRoutes(app);
  registerRoomRoutes(app);

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // NOTE: This returns full user row (including email/passwordHash). Avoid using this on the client.
  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Public racer profile endpoint (safe fields only + privacy enforcement)
  app.get("/api/racer/:username", async (req: any, res) => {
    try {
      const user: any = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ error: "User not found" });

      const viewerId: string | undefined = req.session?.userId;
      const isSelf = !!viewerId && viewerId === user.id;

      let isFriend = false;
      if (viewerId && !isSelf) {
        const friends = await storage.listFriends(user.id);
        isFriend = friends.some((f: any) => f.id === viewerId);
      }

      const canSee = (visibility: string | null | undefined) => {
        const v = visibility || "public";
        if (v === "public") return true;
        if (v === "friends") return isSelf || isFriend;
        if (v === "private") return isSelf;
        return false;
      };

      const stats = await storage.getPlayerStats(user.id);

      // Derive unlocked cars from stats
      const totalRaces = stats?.totalRaces ?? 0;
      const totalWins = stats?.wins ?? 0;
      const unlockedCars: number[] = [0, 1];
      if (totalRaces >= 10) unlockedCars.push(2);
      if (totalWins >= 5) unlockedCars.push(3);
      if (totalRaces >= 25) unlockedCars.push(4);

      res.json({
        id: user.id,
        username: user.username,
        avatarUrl: canSee(user.avatarVisibility)
          ? user.avatarUrl ?? null
          : null,
        bio: canSee(user.bioVisibility) ? user.bio ?? null : null,
        selectedCar: user.selectedCar ?? 0,
        stats: stats ?? null,
        unlockedCars,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get racer" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const existingUser = await storage.getUserByUsername(
        parsed.data.username
      );
      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser(parsed.data);

      await storage.createPlayerStats({
        userId: user.id,
        totalRaces: 0,
        wins: 0,
        avgWpm: 0,
        bestWpm: 0,
        accuracy: 0,
        totalWords: 0,
        playTimeSeconds: 0,
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/stats/:userId", async (req, res) => {
    try {
      const stats = await storage.getPlayerStats(req.params.userId);
      if (!stats) {
        return res.status(404).json({ error: "Stats not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.patch("/api/stats/:userId", async (req, res) => {
    try {
      const stats = await storage.updatePlayerStats(
        req.params.userId,
        req.body
      );
      if (!stats) {
        return res.status(404).json({ error: "Stats not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to update stats" });
    }
  });

  app.get("/api/races/:userId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const results = await storage.getRaceResults(req.params.userId, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to get race results" });
    }
  });

  app.post("/api/races", async (req, res) => {
    try {
      const parsed = insertRaceResultSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const result = await storage.createRaceResult(parsed.data);

      const userId = parsed.data.oderId;
      const existingStats = await storage.getPlayerStats(userId);

      if (existingStats) {
        const newTotalRaces = (existingStats.totalRaces ?? 0) + 1;
        const newWins =
          parsed.data.position === 1
            ? (existingStats.wins ?? 0) + 1
            : existingStats.wins ?? 0;
        const newBestWpm = Math.max(
          existingStats.bestWpm ?? 0,
          parsed.data.wpm
        );
        const newAvgWpm =
          ((existingStats.avgWpm ?? 0) * (existingStats.totalRaces ?? 0) +
            parsed.data.wpm) /
          newTotalRaces;
        const newAccuracy =
          ((existingStats.accuracy ?? 0) * (existingStats.totalRaces ?? 0) +
            parsed.data.accuracy) /
          newTotalRaces;
        const newTotalWords =
          (existingStats.totalWords ?? 0) + parsed.data.wordsTyped;
        const newPlayTime =
          (existingStats.playTimeSeconds ?? 0) +
          Math.round(parsed.data.raceTime);

        await storage.updatePlayerStats(userId, {
          totalRaces: newTotalRaces,
          wins: newWins,
          bestWpm: newBestWpm,
          avgWpm: newAvgWpm,
          accuracy: newAccuracy,
          totalWords: newTotalWords,
          playTimeSeconds: newPlayTime,
        });
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to create race result" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const period = (req.query.period as "all" | "weekly" | "daily") || "all";
      const leaderboard = await storage.getLeaderboard(limit, period);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Friend System Routes

  // Search users to add as friends
  app.get("/api/users/search", async (req: any, res) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const q = req.query.q as string;
      if (!q || q.length < 2) return res.json([]);
      const users = await storage.searchUsers(q);
      // Filter out self
      const others = users.filter((u: any) => u.id !== req.session.userId);
      res.json(others);
    } catch (error) {
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Send friend request
  app.post("/api/friends/request", async (req: any, res) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const { toUserId } = req.body;
      if (!toUserId) return res.status(400).json({ error: "Missing toUserId" });
      if (toUserId === req.session.userId)
        return res.status(400).json({ error: "Cannot add self" });

      await storage.createFriendRequest(req.session.userId, toUserId);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  // List pending friend requests
  app.get("/api/friends/requests", async (req: any, res) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const requests = await storage.listFriendRequests(req.session.userId);
      // Enrich with sender details
      const enriched = await Promise.all(
        requests.map(async (r: any) => {
          const fromUser = await storage.getUser(r.fromUserId);
          return { ...r, fromUser };
        })
      );
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to list friend requests" });
    }
  });

  // Respond to friend request
  app.post("/api/friends/respond", async (req: any, res) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const { requestId, accept } = req.body;
      if (!requestId)
        return res.status(400).json({ error: "Missing requestId" });

      await storage.respondFriendRequest(requestId, accept);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to respond to request" });
    }
  });

  // List friends
  app.get("/api/friends", async (req: any, res) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      const friends = await storage.listFriends(req.session.userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ error: "Failed to list friends" });
    }
  });

  // Remove friend
  app.delete("/api/friends/:id", async (req: any, res) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: "Unauthorized" });
    try {
      await storage.removeFriend(req.session.userId, req.params.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  return httpServer;
}
