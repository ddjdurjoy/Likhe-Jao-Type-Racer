import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";

// Accuracy threshold
const MIN_ACC = 95;

const createPracticeResultBody = z.object({
  mode: z.literal("time"),
  timeSeconds: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120)]),
  wpm: z.number().nonnegative(),
  rawWpm: z.number().nonnegative(),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  errors: z.number().int().nonnegative(),
  language: z.enum(["en", "bn"]),
});

export function registerPracticeLeaderboardRoutes(app: Express) {
  // Personal best for the current user (auth required)
  app.get("/api/practice/pb", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const timeSeconds = Number(req.query.timeSeconds ?? 30) || 30;
      const language = (req.query.language as string) || "en";

      const best = await storage.getPracticeBest({
        userId,
        timeSeconds,
        language,
      } as any);

      res.json(best ?? null);
    } catch {
      res.status(500).json({ error: "Failed to get personal best" });
    }
  });

  // Submit a practice result (auth required)
  app.post("/api/practice/results", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = createPracticeResultBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      }

      if (parsed.data.accuracy < MIN_ACC) {
        return res.status(400).json({ error: `Accuracy must be >= ${MIN_ACC}%` });
      }

      const inserted = await storage.createPracticeResult({
        ...parsed.data,
        userId,
      } as any);

      res.status(201).json(inserted);
    } catch (e) {
      res.status(500).json({ error: "Failed to submit practice result" });
    }
  });

  // Leaderboard by country + bucket
  app.get("/api/practice/leaderboard", async (req, res) => {
    try {
      const limit = Number(req.query.limit ?? 50) || 50;
      const timeSeconds = Number(req.query.timeSeconds ?? 30) || 30;
      const country = (req.query.country as string) || "BD";
      const language = (req.query.language as string) || "en";

      const rows = await storage.getPracticeLeaderboard({
        limit,
        timeSeconds,
        country,
        language,
      } as any);

      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to get practice leaderboard" });
    }
  });
}
