import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

declare global {
  // eslint-disable-next-line no-var
  var libsqlClient: Client | undefined;
}

function resolveLibsqlUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.DATABASE_PATH) {
    return `file:${process.env.DATABASE_PATH}`;
  }

  const defaultDir = path.join(process.cwd(), "data");
  const defaultPath = path.join(defaultDir, "app.db");

  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    const testFile = path.join(defaultDir, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, "");
    fs.unlinkSync(testFile);
    return `file:${defaultPath}`;
  } catch {
    const tmpDir = path.join(os.tmpdir(), "fair-split");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return `file:${path.join(tmpDir, "app.db")}`;
  }
}

const clientUrl = resolveLibsqlUrl();
const authToken = process.env.TURSO_AUTH_TOKEN;

export const rawClient: Client =
  global.libsqlClient ??
  createClient({
    url: clientUrl,
    authToken: authToken,
  });

if (process.env.NODE_ENV !== "production") {
  global.libsqlClient = rawClient;
}

export async function initializeSchema(client: Client = rawClient) {
  await client.execute("PRAGMA foreign_keys = ON;");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Group" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Member" (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      name TEXT NOT NULL,
      stripeAccountId TEXT,
      FOREIGN KEY (groupId) REFERENCES "Group"(id)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Expense" (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      paidByMemberId TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (groupId) REFERENCES "Group"(id),
      FOREIGN KEY (paidByMemberId) REFERENCES "Member"(id)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ExpenseSplit" (
      id TEXT PRIMARY KEY,
      expenseId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      FOREIGN KEY (expenseId) REFERENCES "Expense"(id),
      FOREIGN KEY (memberId) REFERENCES "Member"(id)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "Settlement" (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      fromMemberId TEXT NOT NULL,
      toMemberId TEXT NOT NULL,
      amount REAL NOT NULL,
      stripeTransferId TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (groupId) REFERENCES "Group"(id),
      FOREIGN KEY (fromMemberId) REFERENCES "Member"(id),
      FOREIGN KEY (toMemberId) REFERENCES "Member"(id)
    );
  `);
}

let schemaInitPromise: Promise<void> | null = null;
export async function ensureDbInitialized() {
  if (!schemaInitPromise) {
    schemaInitPromise = initializeSchema(rawClient);
  }
  await schemaInitPromise;
}

export const db = {
  prepare(sql: string) {
    return {
      async run(...args: any[]): Promise<{ changes: number }> {
        await ensureDbInitialized();
        const res = await rawClient.execute({ sql, args });
        return { changes: Number(res.rowsAffected) };
      },
      async get<T = any>(...args: any[]): Promise<T | undefined> {
        await ensureDbInitialized();
        const res = await rawClient.execute({ sql, args });
        if (!res.rows || res.rows.length === 0) return undefined;
        return { ...res.rows[0] } as unknown as T;
      },
      async all<T = any>(...args: any[]): Promise<T[]> {
        await ensureDbInitialized();
        const res = await rawClient.execute({ sql, args });
        return res.rows.map((row) => ({ ...row })) as unknown as T[];
      },
    };
  },
  transaction(fn: (...args: any[]) => Promise<any> | any) {
    return async (...args: any[]) => {
      await ensureDbInitialized();
      const tx = await rawClient.transaction("write");
      try {
        const result = await fn(...args);
        await tx.commit();
        return result;
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    };
  },
};

export default db;
