"use server";

import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import type { Expense } from "@/lib/types";

export interface ExpenseWithDetails extends Expense {
  paidByName: string;
  splitBetween: { id: string; name: string }[];
}

function requiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) throw new Error(`${fieldName} is required.`);
  return trimmedValue;
}

export async function addExpense(
  groupId: string,
  paidByMemberId: string,
  amount: number,
  description: string,
  splitBetweenMemberIds: string[],
): Promise<Expense> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  if (splitBetweenMemberIds.length === 0) throw new Error("Select at least one member to split the expense.");

  const expense: Expense = {
    id: randomUUID(),
    groupId: requiredText(groupId, "Group ID"),
    paidByMemberId: requiredText(paidByMemberId, "Paying member"),
    amount: Math.round(amount * 100) / 100,
    description: requiredText(description, "Description"),
    createdAt: new Date().toISOString(),
  };

  const insertExpense = db.prepare('INSERT INTO "Expense" (id, groupId, paidByMemberId, amount, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
  const insertSplit = db.prepare('INSERT INTO "ExpenseSplit" (id, expenseId, memberId) VALUES (?, ?, ?)');

  db.transaction(() => {
    insertExpense.run(expense.id, expense.groupId, expense.paidByMemberId, expense.amount, expense.description, expense.createdAt);
    for (const memberId of splitBetweenMemberIds) insertSplit.run(randomUUID(), expense.id, memberId);
  })();

  return expense;
}

export async function getExpenses(groupId: string): Promise<ExpenseWithDetails[]> {
  const expenses = db.prepare(`
    SELECT e.id, e.groupId, e.paidByMemberId, e.amount, e.description, e.createdAt, m.name AS paidByName
    FROM "Expense" e JOIN "Member" m ON m.id = e.paidByMemberId
    WHERE e.groupId = ? ORDER BY e.createdAt DESC
  `).all(groupId) as (Expense & { paidByName: string })[];
  const splits = db.prepare(`
    SELECT es.expenseId, m.id, m.name FROM "ExpenseSplit" es JOIN "Member" m ON m.id = es.memberId
    WHERE es.expenseId = ? ORDER BY m.name
  `);

  return expenses.map((expense) => ({ ...expense, splitBetween: splits.all(expense.id) as { id: string; name: string }[] }));
}
