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

function getMemberRemovalDetails(memberId: string): MemberRemovalDetails {
  const member = db
    .prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE id = ?')
    .get(memberId) as Member | undefined;

  if (!member) {
    throw new Error("Traveler not found.");
  }

  const hasSettlement = Boolean(
    db
      .prepare(
        'SELECT id FROM "Settlement" WHERE groupId = ? AND (fromMemberId = ? OR toMemberId = ?) LIMIT 1',
      )
      .get(member.groupId, member.id, member.id),
  );
  const removedExpenseCount = (
    db.prepare('SELECT COUNT(*) AS count FROM "Expense" WHERE paidByMemberId = ?').get(member.id) as {
      count: number;
    }
  ).count;
  const removedExpenseSplitCount = (
    db.prepare('SELECT COUNT(*) AS count FROM "ExpenseSplit" WHERE memberId = ?').get(member.id) as {
      count: number;
    }
  ).count;

  return { member, hasSettlement, removedExpenseCount, removedExpenseSplitCount };
}

export async function createGroup(name: string): Promise<Group> {
  const group: Group = { id: randomUUID(), name: requiredText(name, "Group name"), createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO "Group" (id, name, createdAt) VALUES (?, ?, ?)').run(group.id, group.name, group.createdAt);
  return group;
}

export async function addMember(groupId: string, name: string, stripeAccountId?: string): Promise<Member> {
  const normalizedGroupId = requiredText(groupId, "Group ID");
  const normalizedName = requiredText(name, "Member name");
  const normalizedStripeAccountId = stripeAccountId?.trim() || null;

  const duplicateName = db
    .prepare('SELECT name FROM "Member" WHERE groupId = ? AND LOWER(TRIM(name)) = LOWER(?)')
    .get(normalizedGroupId, normalizedName) as { name: string } | undefined;

  if (duplicateName) {
    throw new Error(`A traveler named ${duplicateName.name} already exists in this group.`);
  }

  if (normalizedStripeAccountId) {
    const duplicateStripeAccount = db
      .prepare('SELECT name FROM "Member" WHERE groupId = ? AND stripeAccountId = ?')
      .get(normalizedGroupId, normalizedStripeAccountId) as { name: string } | undefined;

    if (duplicateStripeAccount) {
      throw new Error(`This Stripe account is already used by ${duplicateStripeAccount.name} in this group.`);
    }
  }

  const member: Member = { id: randomUUID(), groupId: normalizedGroupId, name: normalizedName, stripeAccountId: normalizedStripeAccountId };
  db.prepare('INSERT INTO "Member" (id, groupId, name, stripeAccountId) VALUES (?, ?, ?, ?)').run(member.id, member.groupId, member.name, member.stripeAccountId);
  return member;
}

export async function getMemberRemovalPreview(memberId: string): Promise<MemberRemovalPreview> {
  const details = getMemberRemovalDetails(memberId);

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
  const details = getMemberRemovalDetails(memberId);

  if (details.hasSettlement) {
    throw new Error(`${details.member.name} can't be removed — they have a completed settlement on record.`);
  }

  db.transaction(() => {
    db.prepare('DELETE FROM "ExpenseSplit" WHERE memberId = ?').run(details.member.id);
    db
      .prepare('DELETE FROM "ExpenseSplit" WHERE expenseId IN (SELECT id FROM "Expense" WHERE paidByMemberId = ?)')
      .run(details.member.id);
    db.prepare('DELETE FROM "Expense" WHERE paidByMemberId = ?').run(details.member.id);
    db.prepare('DELETE FROM "Member" WHERE id = ?').run(details.member.id);
  })();

  return {
    success: true,
    removedExpenseCount: details.removedExpenseCount,
    removedExpenseSplitCount: details.removedExpenseSplitCount,
  };
}

export async function getGroup(groupId: string): Promise<GroupWithMembers | null> {
  const group = db.prepare('SELECT id, name, createdAt FROM "Group" WHERE id = ?').get(groupId) as Group | undefined;
  if (!group) return null;
  const members = db.prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE groupId = ? ORDER BY name').all(groupId) as Member[];
  return { group, members };
}
