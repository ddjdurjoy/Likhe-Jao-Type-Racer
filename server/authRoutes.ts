import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { hashPassword, verifyPassword, makeToken } from "./auth";
import { ensureGuestUserId } from "./guest";
import multer from "multer";
import path from "path";
import { ensureUploadsDir, UPLOADS_DIR } from "./uploads";

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function registerAuthRoutes(app: Express) {
  ensureUploadsDir();

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (req: any, file, cb) => {
        // keep extension; unique per user+time
        const ext = path.extname(file.originalname || "").slice(0, 10) || ".png";
        cb(null, `avatar-${req.session?.userId || "anon"}-${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
      const ok = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.mimetype);
      if (!ok) return cb(new Error("Only image uploads are allowed"));
      cb(null, true);
    },
  });
  app.get("/api/auth/me", async (req: any, res) => {
    // Guest mode: always ensure a session user so the app can work without sign-in.
    const userId = await ensureGuestUserId(req);
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

    const uname = parsed.data.username.trim();
    if (/\s/.test(uname)) return res.status(400).json({ error: "Username cannot contain spaces" });
    const user: any = await storage.getUserByUsername(uname);
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

  // Change password (requires current password)
  app.post("/api/auth/password", requireAuth, async (req: any, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).max(200),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const user: any = await storage.getUser(req.session.userId);
    if (!user?.passwordHash) return res.status(400).json({ error: "Password not set" });

    if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = hashPassword(parsed.data.newPassword);
    const updated: any = await storage.updateUser(req.session.userId, { passwordHash });
    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json({ ok: true });
  });

  // Upload avatar image for the signed-in user
  app.post("/api/auth/avatar", requireAuth, upload.single("avatar"), async (req: any, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Save as a relative URL served by express static
    const avatarUrl = `/uploads/${file.filename}`;
    const user: any = await storage.updateUser(req.session.userId, { avatarUrl });
    if (!user) return res.status(404).json({ error: "User not found" });

    const { passwordHash, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.json({ ...safe, avatarUrl });
  });

  // Settings: Profile (username + display name)
  app.patch("/api/auth/settings/profile", requireAuth, async (req: any, res) => {
    const schema = z.object({
      username: z.string().min(3).max(24).optional(),
      displayName: z.string().min(1).max(50).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const updates: any = {};

    if (parsed.data.username !== undefined) {
      const uname = parsed.data.username.trim();
      if (/\s/.test(uname)) return res.status(400).json({ error: "Username cannot contain spaces" });

      const me: any = await storage.getUser(req.session.userId);
      if (!me) return res.status(404).json({ error: "User not found" });

      if (uname.toLowerCase() !== (me.username || "").toLowerCase()) {
        const existing = await storage.getUserByUsername(uname);
        if (existing) return res.status(409).json({ error: "Username already taken" });
      }
      updates.username = uname;
    }

    if (parsed.data.displayName !== undefined) {
      updates.displayName = parsed.data.displayName ? parsed.data.displayName.trim() : null;
    }

    const user: any = await storage.updateUser(req.session.userId, updates);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { passwordHash, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.json(safe);
  });

  // Settings: Account (name + email)
  app.patch("/api/auth/settings/account", requireAuth, async (req: any, res) => {
    const schema = z.object({
      firstName: z.string().max(50).nullable().optional(),
      lastName: z.string().max(50).nullable().optional(),
      email: z.string().email().max(200).nullable().optional(),
      country: z.string().max(2).nullable().optional(), // ISO-2 like "BD"
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const me: any = await storage.getUser(req.session.userId);
    if (!me) return res.status(404).json({ error: "User not found" });

    const updates: any = {};
    if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName ? parsed.data.firstName.trim() : null;
    if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName ? parsed.data.lastName.trim() : null;
    if (parsed.data.country !== undefined) updates.country = parsed.data.country ? parsed.data.country.trim().toUpperCase() : null;

    if (parsed.data.email !== undefined) {
      const nextEmail = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;
      if (nextEmail && nextEmail !== (me.email || "").toLowerCase()) {
        const existingEmail = await storage.getUserByEmail(nextEmail);
        if (existingEmail) return res.status(409).json({ error: "Email already in use" });
      }
      // If email changed, reset verification state
      const changed = (nextEmail || null) !== ((me.email || null) ? String(me.email).toLowerCase() : null);
      updates.email = nextEmail;
      if (changed) {
        updates.emailVerifiedAt = null;
        updates.emailVerifyToken = null;
        updates.emailVerifyTokenExpiresAt = null;
      }
    }

    const user: any = await storage.updateUser(req.session.userId, updates);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { passwordHash, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.json(safe);
  });

  // Update public profile (avatar + bio) for the signed-in user
  app.patch("/api/auth/profile", requireAuth, async (req: any, res) => {
    const schema = z.object({
      avatarUrl: z.string().url().max(500).nullable().optional(),
      bio: z.string().max(500).nullable().optional(),
      avatarVisibility: z.enum(["public", "friends", "private"]).optional(),
      bioVisibility: z.enum(["public", "friends", "private"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const updates: any = {};
    if ("avatarUrl" in parsed.data) updates.avatarUrl = parsed.data.avatarUrl;
    if ("bio" in parsed.data) updates.bio = parsed.data.bio;
    if ("avatarVisibility" in parsed.data) updates.avatarVisibility = (parsed.data as any).avatarVisibility;
    if ("bioVisibility" in parsed.data) updates.bioVisibility = (parsed.data as any).bioVisibility;

    const user: any = await storage.updateUser(req.session.userId, updates);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { passwordHash, emailVerifyToken, emailVerifyTokenExpiresAt, ...safe } = user;
    res.json(safe);
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
