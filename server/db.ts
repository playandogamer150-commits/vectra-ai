import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("CRITICAL ERROR: DATABASE_URL is not defined in the environment.");
  console.error("Ensure you have a .env file with DATABASE_URL set to your Supabase connection string.");
  process.exit(1);
}

// Support for Supabase Session Pooler (port 6543) requires SSL
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("supabase.com") ? { rejectUnauthorized: false } : false,
  // Replit + Supabase pooler can have occasional cold-start latency; keep this conservative
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const db = drizzle(pool, { schema });
