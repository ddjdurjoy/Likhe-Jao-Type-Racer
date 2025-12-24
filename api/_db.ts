import * as schema from "../shared/schema";

// Avoid importing Node-only modules at module load time in Vercel.
// We dynamically import `pg` and `drizzle-orm/node-postgres` inside functions.

let pool: any | null = null;
let db: any | null = null;

async function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pg = await import("pg");
  const Pool = (pg as any).Pool;

  // Neon requires SSL. This config works well on Vercel.
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
}

export function getDb() {
  // Note: keep sync signature for existing handlers.
  // If DB isn't initialized yet, we throw a clear error.
  if (db) return db;
  throw new Error("DB not initialized - call initDb() first");
}

export async function initDb() {
  if (db) return db;

  pool = await createPool();
  const drizzleMod = await import("drizzle-orm/node-postgres");
  const drizzle = (drizzleMod as any).drizzle;

  db = drizzle(pool, { schema });
  return db;
}

export async function pingDb() {
  try {
    const p = await createPool();
    const client = await p.connect();
    const result = await client.query("select 1 as ok");
    client.release();
    await p.end();
    return { ok: true as const, result: result.rows?.[0] };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) };
  }
}

