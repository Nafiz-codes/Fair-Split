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

function printDemoSummary(group: Group) {
  const members = db.prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE groupId = ? ORDER BY name').all(group.id) as Member[];
  const expenses = db.prepare('SELECT id, groupId, paidByMemberId, amount, description, createdAt FROM "Expense" WHERE groupId = ? ORDER BY createdAt').all(group.id) as Expense[];
  const getSplits = db.prepare('SELECT memberId FROM "ExpenseSplit" WHERE expenseId = ?');
  const balances = computeBalances(members, expenses.map((expense) => ({
    ...expense,
    splitBetween: (getSplits.all(expense.id) as { memberId: string }[]).map((split) => split.memberId),
  })));

  console.log(`Group ID: ${group.id}`);
  console.log(`Open: http://localhost:3000/group/${group.id}`);
  console.log("Balances:");
  for (const balance of balances) {
    const amount = Math.abs(balance.amount).toFixed(2);
    const label = balance.amount > 0 ? `is owed $${amount}` : balance.amount < 0 ? `owes $${amount}` : "is settled up";
    console.log(`  ${balance.name} ${label}`);
  }
}

const existingGroup = db.prepare('SELECT id, name, createdAt FROM "Group" WHERE name = ?').get(groupName) as Group | undefined;

if (existingGroup) {
  console.log(`A demo group named "${groupName}" already exists; skipping creation.`);
  printDemoSummary(existingGroup);
} else {
  const now = new Date().toISOString();
  const group: Group = { id: randomUUID(), name: groupName, createdAt: now };
  const members = new Map<string, Member>();

  const insertGroup = db.prepare('INSERT INTO "Group" (id, name, createdAt) VALUES (?, ?, ?)');
  const insertMember = db.prepare('INSERT INTO "Member" (id, groupId, name, stripeAccountId) VALUES (?, ?, ?, ?)');
  const insertExpense = db.prepare('INSERT INTO "Expense" (id, groupId, paidByMemberId, amount, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
  const insertSplit = db.prepare('INSERT INTO "ExpenseSplit" (id, expenseId, memberId) VALUES (?, ?, ?)');

  db.transaction(() => {
    insertGroup.run(group.id, group.name, group.createdAt);

    for (const seed of memberSeeds) {
      const member: Member = { id: randomUUID(), groupId: group.id, ...seed };
      insertMember.run(member.id, member.groupId, member.name, member.stripeAccountId);
      members.set(member.name, member);
    }

    for (const seed of expenseSeeds) {
      const payer = members.get(seed.paidBy)!;
      const expense: Expense = { id: randomUUID(), groupId: group.id, paidByMemberId: payer.id, amount: seed.amount, description: seed.description, createdAt: now };
      insertExpense.run(expense.id, expense.groupId, expense.paidByMemberId, expense.amount, expense.description, expense.createdAt);

      for (const memberName of seed.splitBetween) {
        insertSplit.run(randomUUID(), expense.id, members.get(memberName)!.id);
      }
    }
  })();

  console.log(`Created demo group "${groupName}".`);
  printDemoSummary(group);
}
