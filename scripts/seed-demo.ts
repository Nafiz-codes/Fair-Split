import { randomUUID } from "node:crypto";
import { computeBalances } from "../lib/balances";
import db from "../lib/db";
import type { Expense, Group, Member } from "../lib/types";

const groupName = "Dhaka Trip";

const memberSeeds = [
  { name: "Alice", stripeAccountId: "acct_1U8RaGIDZe7DHqb8" },
  { name: "Bob", stripeAccountId: "acct_1U8RfNIDZeZDhvKV" },
  { name: "Sara", stripeAccountId: "acct_1U8RmEIDZes9q4MO" },
  { name: "Charlie", stripeAccountId: "acct_1U8iQ7IDZepc8hCv" },
];

const expenseSeeds = [
  { description: "Hotel booking", amount: 240, paidBy: "Alice", splitBetween: ["Alice", "Bob", "Sara", "Charlie"] },
  { description: "Dinner at restaurant", amount: 85, paidBy: "Bob", splitBetween: ["Alice", "Bob", "Sara"] },
  { description: "Uber rides", amount: 32, paidBy: "Sara", splitBetween: ["Sara", "Charlie"] },
  { description: "Groceries", amount: 58, paidBy: "Charlie", splitBetween: ["Alice", "Bob", "Sara", "Charlie"] },
  { description: "Museum tickets", amount: 40, paidBy: "Alice", splitBetween: ["Alice", "Charlie"] },
];

async function printDemoSummary(group: Group) {
  const members = await db.prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE groupId = ? ORDER BY name').all<Member>(group.id);
  const expenses = await db.prepare('SELECT id, groupId, paidByMemberId, amount, description, createdAt FROM "Expense" WHERE groupId = ? ORDER BY createdAt').all<Expense>(group.id);

  const formattedExpenses: (Expense & { splitBetween: string[] })[] = [];
  for (const expense of expenses) {
    const splits = await db.prepare('SELECT memberId FROM "ExpenseSplit" WHERE expenseId = ?').all<{ memberId: string }>(expense.id);
    formattedExpenses.push({
      ...expense,
      splitBetween: splits.map((split) => split.memberId),
    });
  }

  const balances = computeBalances(members, formattedExpenses);

  console.log(`Group ID: ${group.id}`);
  console.log(`Open: http://localhost:3000/group/${group.id}`);
  console.log("Balances:");
  for (const balance of balances) {
    const amount = Math.abs(balance.amount).toFixed(2);
    const label = balance.amount > 0 ? `is owed $${amount}` : balance.amount < 0 ? `owes $${amount}` : "is settled up";
    console.log(`  ${balance.name} ${label}`);
  }
}

async function main() {
  const existingGroup = await db.prepare('SELECT id, name, createdAt FROM "Group" WHERE name = ?').get<Group>(groupName);

  if (existingGroup) {
    console.log(`A demo group named "${groupName}" already exists; skipping creation.`);
    await printDemoSummary(existingGroup);
  } else {
    const now = new Date().toISOString();
    const group: Group = { id: randomUUID(), name: groupName, createdAt: now };
    const members = new Map<string, Member>();

    await db.transaction(async () => {
      await db.prepare('INSERT INTO "Group" (id, name, createdAt) VALUES (?, ?, ?)').run(group.id, group.name, group.createdAt);

      for (const seed of memberSeeds) {
        const member: Member = { id: randomUUID(), groupId: group.id, ...seed };
        await db.prepare('INSERT INTO "Member" (id, groupId, name, stripeAccountId) VALUES (?, ?, ?, ?)').run(member.id, member.groupId, member.name, member.stripeAccountId);
        members.set(member.name, member);
      }

      for (const seed of expenseSeeds) {
        const payer = members.get(seed.paidBy)!;
        const expense: Expense = { id: randomUUID(), groupId: group.id, paidByMemberId: payer.id, amount: seed.amount, description: seed.description, createdAt: now };
        await db.prepare('INSERT INTO "Expense" (id, groupId, paidByMemberId, amount, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(expense.id, expense.groupId, expense.paidByMemberId, expense.amount, expense.description, expense.createdAt);

        for (const memberName of seed.splitBetween) {
          await db.prepare('INSERT INTO "ExpenseSplit" (id, expenseId, memberId) VALUES (?, ?, ?)').run(randomUUID(), expense.id, members.get(memberName)!.id);
        }
      }
    })();

    console.log(`Created demo group "${groupName}".`);
    await printDemoSummary(group);
  }
}

main().catch(console.error);
