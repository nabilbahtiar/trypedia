import { Pool } from "pg";

// Global connection pool for Next.js
declare global {
  var _pgPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || "postgres"}:${encodeURIComponent(
    process.env.DB_PASSWORD || "postgres"
  )}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${
    process.env.DB_NAME || "trypedia_db"
  }`;

export const pool: Pool =
  global._pgPool ||
  new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

