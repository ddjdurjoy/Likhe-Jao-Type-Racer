import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pingDb } from "./_db";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const dbStatus = await pingDb();
  // Always return 200 so clients (and browser console) can read diagnostics
  // without showing it as a failed network request.
  return res.status(200).json({
    ok: dbStatus.ok,
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    db: dbStatus,
  });
}
