import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertRaceResultSchema,
} from "@shared/schema";
import { z } from "zod";

import { registerAuthRoutes } from "./authRoutes";
import { registerFriendRoutes } from "./friendRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  registerAuthRoutes(app);
  registerFriendRoutes(app);

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
        username: user.username,
        avatarUrl: canSee(user.avatarVisibility) ? user.avatarUrl ?? null : null,
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

      const existingUser = await storage.getUserByUsername(parsed.data.username);
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
      const stats = await storage.updatePlayerStats(req.params.userId, req.body);
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
        const newWins = parsed.data.position === 1
          ? (existingStats.wins ?? 0) + 1
          : existingStats.wins ?? 0;
        const newBestWpm = Math.max(existingStats.bestWpm ?? 0, parsed.data.wpm);
        const newAvgWpm =
          ((existingStats.avgWpm ?? 0) * (existingStats.totalRaces ?? 0) + parsed.data.wpm) /
          newTotalRaces;
        const newAccuracy =
          ((existingStats.accuracy ?? 0) * (existingStats.totalRaces ?? 0) + parsed.data.accuracy) /
          newTotalRaces;
        const newTotalWords = (existingStats.totalWords ?? 0) + parsed.data.wordsTyped;
        const newPlayTime = (existingStats.playTimeSeconds ?? 0) + Math.round(parsed.data.raceTime);

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

  return httpServer;
}
