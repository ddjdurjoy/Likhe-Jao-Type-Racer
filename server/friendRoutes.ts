import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function registerFriendRoutes(app: Express) {
  app.get("/api/friends", requireAuth, async (req: any, res) => {
    const friends = await storage.listFriends(req.session.userId);
    res.json(friends.map((u: any) => ({ id: u.id, username: u.username })));
  });

  app.get("/api/friends/requests", requireAuth, async (req: any, res) => {
    const reqs = await storage.listFriendRequests(req.session.userId);
    res.json(reqs);
  });

  app.get("/api/users/search", requireAuth, async (req: any, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const results = await storage.searchUsers(q, 20);
    res.json(results.map((u: any) => ({ id: u.id, username: u.username })));
  });

  app.post("/api/friends/request", requireAuth, async (req: any, res) => {
    const schema = z.object({ toUserId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    if (parsed.data.toUserId === req.session.userId) return res.status(400).json({ error: "Cannot friend yourself" });
    await storage.createFriendRequest(req.session.userId, parsed.data.toUserId);
    res.json({ ok: true });
  });

  app.post("/api/friends/respond", requireAuth, async (req: any, res) => {
    const schema = z.object({ requestId: z.string().min(1), accept: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    await storage.respondFriendRequest(parsed.data.requestId, parsed.data.accept);
    res.json({ ok: true });
  });

  app.post("/api/friends/remove", requireAuth, async (req: any, res) => {
    const schema = z.object({ friendUserId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    await storage.removeFriend(req.session.userId, parsed.data.friendUserId);
    res.json({ ok: true });
  });
}
