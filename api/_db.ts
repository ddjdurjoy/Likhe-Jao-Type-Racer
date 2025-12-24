import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  db = drizzle(pool, { schema });
  return db;
}

export async function pingDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { ok: false as const, error: "DATABASE_URL is not set" };
  }

  try {
    const p = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    const client = await p.connect();
    const result = await client.query("select 1 as ok");
    client.release();
    await p.end();
    return { ok: true as const, result: result.rows?.[0] };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) };
  }
}
