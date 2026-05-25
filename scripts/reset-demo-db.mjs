import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

function loadEnvFile(path) {
  try {
    const env = readFileSync(path, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^"|"$/g, "");
    }
  } catch {
    // optional
  }
}

function assertLocalDatabase(databaseUrl) {
  const url = new URL(databaseUrl);
  const safeHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (safeHosts.has(url.hostname)) return;
  if (process.env.ALLOW_DEMO_DB_RESET === "true") return;
  throw new Error(
    `Refusing to reset non-local database host "${url.hostname}". Set ALLOW_DEMO_DB_RESET=true only for a disposable test DB.`,
  );
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Missing DATABASE_URL.");
assertLocalDatabase(databaseUrl);

const pool = new Pool({ connectionString: databaseUrl });

try {
  console.warn("Resetting local demo database schema public...");
  await pool.query("drop schema if exists public cascade");
  await pool.query("create schema public");
} finally {
  await pool.end();
}

const seed = spawnSync(process.execPath, ["scripts/seed-auth.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    ALLOW_DEMO_SEED: "true",
  },
});

if (seed.status !== 0) {
  process.exit(seed.status ?? 1);
}

const postPool = new Pool({ connectionString: databaseUrl });
try {
  for (const file of [
    "database/assignment_target_management.sql",
    "database/finalize_assignment_types_and_writing.sql",
    "database/calendar_notice_test.sql",
    "database/performance_indexes.sql",
  ]) {
    console.log(`Applying ${file}`);
    await postPool.query(readFileSync(file, "utf8"));
  }
  console.log("Demo database reset complete.");
} finally {
  await postPool.end();
}
