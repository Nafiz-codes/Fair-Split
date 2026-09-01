"use server";

import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import type { Group, GroupWithMembers, Member } from "@/lib/types";

export type MemberRemovalPreview = {
  memberId: string;
  memberName: string;
  canRemove: boolean;
  removedExpenseCount: number;
  removedExpenseSplitCount: number;
  error?: string;
};

type MemberRemovalDetails = {
  member: Member;
  hasSettlement: boolean;
  removedExpenseCount: number;
  removedExpenseSplitCount: number;
};

function requiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) throw new Error(`${fieldName} is required.`);
  return trimmedValue;
}

async function getMemberRemovalDetails(memberId: string): Promise<MemberRemovalDetails> {
  const member = (await db
    .prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE id = ?')
    .get<Member>(memberId)) as Member | undefined;

  if (!member) {
    throw new Error("Traveler not found.");
  }

  const hasSettlement = Boolean(
    await db
      .prepare(
        'SELECT id FROM "Settlement" WHERE groupId = ? AND (fromMemberId = ? OR toMemberId = ?) LIMIT 1',
      )
      .get(member.groupId, member.id, member.id),
  );
  const removedExpenseCount = ((await db
    .prepare('SELECT COUNT(*) AS count FROM "Expense" WHERE paidByMemberId = ?')
    .get<{ count: number }>(member.id)) ?? { count: 0 }).count;
  const removedExpenseSplitCount = ((await db
    .prepare('SELECT COUNT(*) AS count FROM "ExpenseSplit" WHERE memberId = ?')
    .get<{ count: number }>(member.id)) ?? { count: 0 }).count;

  return { member, hasSettlement, removedExpenseCount, removedExpenseSplitCount };
}

export async function createGroup(name: string): Promise<Group> {
  const group: Group = { id: randomUUID(), name: requiredText(name, "Group name"), createdAt: new Date().toISOString() };
  await db.prepare('INSERT INTO "Group" (id, name, createdAt) VALUES (?, ?, ?)').run(group.id, group.name, group.createdAt);
  return group;
}

export async function addMember(groupId: string, name: string, stripeAccountId?: string): Promise<Member> {
  const normalizedGroupId = requiredText(groupId, "Group ID");
  const normalizedName = requiredText(name, "Member name");
  const normalizedStripeAccountId = stripeAccountId?.trim() || null;

  const duplicateName = await db
    .prepare('SELECT name FROM "Member" WHERE groupId = ? AND LOWER(TRIM(name)) = LOWER(?)')
    .get<{ name: string }>(normalizedGroupId, normalizedName);

  if (duplicateName) {
    throw new Error(`A traveler named ${duplicateName.name} already exists in this group.`);
  }

  if (normalizedStripeAccountId) {
    const duplicateStripeAccount = await db
      .prepare('SELECT name FROM "Member" WHERE groupId = ? AND stripeAccountId = ?')
      .get<{ name: string }>(normalizedGroupId, normalizedStripeAccountId);

    if (duplicateStripeAccount) {
      throw new Error(`This Stripe account is already used by ${duplicateStripeAccount.name} in this group.`);
    }
  }

  const member: Member = { id: randomUUID(), groupId: normalizedGroupId, name: normalizedName, stripeAccountId: normalizedStripeAccountId };
  await db.prepare('INSERT INTO "Member" (id, groupId, name, stripeAccountId) VALUES (?, ?, ?, ?)').run(member.id, member.groupId, member.name, member.stripeAccountId);
  return member;
}

export async function getMemberRemovalPreview(memberId: string): Promise<MemberRemovalPreview> {
  const details = await getMemberRemovalDetails(memberId);

  if (details.hasSettlement) {
    return {
      memberId: details.member.id,
      memberName: details.member.name,
      canRemove: false,
      removedExpenseCount: details.removedExpenseCount,
      removedExpenseSplitCount: details.removedExpenseSplitCount,
      error: `${details.member.name} can't be removed — they have a completed settlement on record.`,
    };
  }

  return {
    memberId: details.member.id,
    memberName: details.member.name,
    canRemove: true,
    removedExpenseCount: details.removedExpenseCount,
    removedExpenseSplitCount: details.removedExpenseSplitCount,
  };
}

export async function removeMember(memberId: string): Promise<{
  success: true;
  removedExpenseCount: number;
  removedExpenseSplitCount: number;
}> {
  const details = await getMemberRemovalDetails(memberId);

  if (details.hasSettlement) {
    throw new Error(`${details.member.name} can't be removed — they have a completed settlement on record.`);
  }

  await db.transaction(async () => {
    await db.prepare('DELETE FROM "ExpenseSplit" WHERE memberId = ?').run(details.member.id);
    await db
      .prepare('DELETE FROM "ExpenseSplit" WHERE expenseId IN (SELECT id FROM "Expense" WHERE paidByMemberId = ?)')
      .run(details.member.id);
    await db.prepare('DELETE FROM "Expense" WHERE paidByMemberId = ?').run(details.member.id);
    await db.prepare('DELETE FROM "Member" WHERE id = ?').run(details.member.id);
  })();

  return {
    success: true,
    removedExpenseCount: details.removedExpenseCount,
    removedExpenseSplitCount: details.removedExpenseSplitCount,
  };
}

export async function getGroup(groupId: string): Promise<GroupWithMembers | null> {
  const group = await db.prepare('SELECT id, name, createdAt FROM "Group" WHERE id = ?').get<Group>(groupId);
  if (!group) return null;
  const members = await db.prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE groupId = ? ORDER BY name').all<Member>(groupId);
  return { group, members };
}
