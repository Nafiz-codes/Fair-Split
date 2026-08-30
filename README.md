# Fair Split

Fair Split is a lightweight shared-expense ledger for trips. Create a group, add travelers, file receipts, see who owes what, and record Stripe Connect settlement transfers.

Built with Next.js 14, TypeScript, Tailwind CSS, raw SQLite queries via `better-sqlite3`, and Stripe Connect.

## Features

- Create trip groups and add travelers
- Prevent duplicate traveler names and Stripe Connect account IDs within a group
- Record expenses with custom split participants
- Calculate net balances and simplify them into the fewest practical settlement payments
- Record settlement history and run Stripe test-mode transfers
- Remove travelers safely, with an expense-deletion preview and settlement-history protection
- Seed an idempotent **Dhaka Trip** demo ledger

## Local setup

Prerequisites:

- Node.js 20 or later
- A Stripe sandbox/test account if you want to test settlements

Install dependencies and configure your local environment:

```bash
npm install
cp .env.local.example .env.local
```

On PowerShell, use this instead of `cp`:

```powershell
Copy-Item .env.local.example .env.local
```

Add your Stripe sandbox keys to `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo data

Seed the demo group:

```bash
npm run seed
```

The script creates a **Dhaka Trip** group only if it does not already exist, prints its URL, and prints the computed balances.

## Stripe sandbox testing

Stripe Connect account IDs and API keys must belong to the **same Stripe sandbox**. A connected-account ID from another sandbox will not work with the current sandbox key.

Before testing a settlement, fund the platform's available test balance. The local development route below creates a `$500` test charge using Stripe's `tok_bypassPending` token:

```text
http://localhost:3000/api/fund-test-balance
```

Visit it once per new sandbox, or again only when the sandbox has insufficient balance. Each visit adds another `$500` test charge. For example, a `$650` transfer needs at least two visits from a zero balance.

The settlement flow uses the platform's available **card** balance for USD transfers. Failed settlements remain in the history; after funding, refresh the group page and submit a new settlement attempt.

> The funding route is for local sandbox use only. Protect or remove it before any production deployment.

## Database

The local database is stored at:

```text
data/app.db
```

It is initialized automatically by [`lib/db.ts`](lib/db.ts). The schema contains:

- `Group`
- `Member`
- `Expense`
- `ExpenseSplit`
- `Settlement`

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production application |
| `npm run start` | Run the built application |
| `npm run lint` | Run Next.js linting |
| `npm run seed` | Create or print the demo ledger |

## Deploying to Vercel

Deploy from this repository's root directory (`.`). Add the Stripe sandbox or live keys as Vercel environment variables and redeploy after changing them.

The current `better-sqlite3` database at `data/app.db` is local-file storage. Vercel's serverless filesystem is not persistent or suitable for application writes, so use a hosted database before deploying a write-enabled version. Turso/libSQL is a lightweight SQLite-compatible option; a managed Postgres database is another good choice.

## Project structure

```text
app/                 Next.js pages, server actions, and routes
components/          Client-side UI components
lib/                 Database, Stripe, balance logic, and shared types
scripts/             Demo-data seeding script
data/app.db          Local SQLite database (ignored from Git)
```
