import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { hashPassword, verifyPassword, makeToken } from "./auth";

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/me", async (req: any, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(200).json(null);
    const user: any = await storage.getUser(userId);
    if (!user) return res.status(200).json(null);
    // never leak passwordHash/token
    const { passwordHash, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.json(safe);
  });

  app.post("/api/auth/signup", async (req: any, res) => {
    const schema = z.object({
      username: z.string().min(3).max(24),
      password: z.string().min(6).max(200),
      email: z.string().email().optional().or(z.literal("")),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const rawUsername = parsed.data.username;
    const username = rawUsername.trim();
    if (/\s/.test(username)) return res.status(400).json({ error: "Username cannot contain spaces" });
    const { password } = parsed.data;
    const email = parsed.data.email?.trim() || undefined;

    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Username already taken" });
    if (email) {
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = hashPassword(password);
    const user: any = await storage.createUserWithAuth({ username, passwordHash, email });

    // Create verification token if email provided (verification can be done later)
    if (email) {
      const token = makeToken(16);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
      await storage.setEmailVerification(user.id, token, expiresAt);
      // NOTE: no email sending yet; return token in dev for testing
      if (process.env.NODE_ENV !== "production") {
        res.setHeader("x-dev-email-verify-token", token);
      }
    }

    req.session.userId = user.id;
    const { passwordHash: ph, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.status(201).json(safe);
  });

  app.post("/api/auth/signin", async (req: any, res) => {
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const user: any = await storage.getUserByUsername(parsed.data.username);
    if (!user?.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    if (!verifyPassword(parsed.data.password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    const { passwordHash, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.json(safe);
  });

  app.post("/api/auth/signout", (req: any, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  // Email verification
  app.post("/api/auth/email/request", requireAuth, async (req: any, res) => {
    const user: any = await storage.getUser(req.session.userId);
    if (!user?.email) return res.status(400).json({ error: "No email set" });
    const token = makeToken(16);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await storage.setEmailVerification(user.id, token, expiresAt);
    if (process.env.NODE_ENV !== "production") {
      return res.json({ ok: true, devToken: token });
    }
    // TODO: send email
    res.json({ ok: true });
  });

  app.post("/api/auth/email/verify", async (req: any, res) => {
    const schema = z.object({ token: z.string().min(6) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const user: any = await storage.verifyEmailToken(parsed.data.token);
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });
    res.json({ ok: true });
  });
}
