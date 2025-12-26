import type { Request } from "express";
import { storage } from "./storage";
import { makeToken } from "./auth";

/**
 * Ensures there is a userId in the session.
 *
 * If none exists, it creates a new "guest" user (no password/email) and stores
 * the userId in the session.
 */
export async function ensureGuestUserId(req: Request & { session?: any }): Promise<string> {
  const existing = req.session?.userId;
  if (existing) return existing;

  // Generate a reasonably-unique, human-friendly username.
  // Retry a few times in case of collisions.
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = `guest_${makeToken(3)}`; // e.g. guest_a1B2c3
    const already = await storage.getUserByUsername(username);
    if (already) continue;

    const user = await storage.createUser({
      username,
      // defaults are handled by storage/db (nullable auth fields)
      language: "en" as any,
      theme: "dark" as any,
      selectedCar: 0,
      soundEnabled: 1,
      volume: 80,
      country: "BD" as any,
    } as any);

    // Ensure stats row exists for guest.
    const stats = await storage.getPlayerStats(user.id);
    if (!stats) {
      await storage.createPlayerStats({
        userId: user.id,
        totalRaces: 0,
        wins: 0,
        avgWpm: 0,
        bestWpm: 0,
        accuracy: 0,
        totalWords: 0,
        playTimeSeconds: 0,
      } as any);
    }

    if (req.session) req.session.userId = user.id;
    return user.id;
  }

  // Extremely unlikely, but avoid infinite loops.
  const fallback = await storage.createUser({ username: `guest_${Date.now()}` } as any);
  if (req.session) req.session.userId = fallback.id;
  return fallback.id;
}
