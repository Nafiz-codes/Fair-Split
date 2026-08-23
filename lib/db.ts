import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = path.join(process.cwd(), "data", "app.db");

declare global {
  // eslint-disable-next-line no-var
  var sqliteDb: Database.Database | undefined;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS "Group" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "Member" (
      id TEXT PRIMARY KEY,
      groupId TEXT NOT NULL,
      name TEXT NOT NULL,
      stripeAccountId TEXT,
      FOREIGN KEY (groupId) REFERENCES "Group"(id)
    );

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

    CREATE TABLE IF NOT EXISTS "ExpenseSplit" (
      id TEXT PRIMARY KEY,
      expenseId TEXT NOT NULL,
      memberId TEXT NOT NULL,
      FOREIGN KEY (expenseId) REFERENCES "Expense"(id),
      FOREIGN KEY (memberId) REFERENCES "Member"(id)
    );

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

function createDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  initializeSchema(database);
  return database;
}

export const db = global.sqliteDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  global.sqliteDb = db;
}

export { initializeSchema };
export default db;
