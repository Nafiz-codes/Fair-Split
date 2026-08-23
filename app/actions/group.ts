"use server";

import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import type { Group, GroupWithMembers, Member } from "@/lib/types";

function requiredText(value: string, fieldName: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) throw new Error(`${fieldName} is required.`);
  return trimmedValue;
}

export async function createGroup(name: string): Promise<Group> {
  const group: Group = { id: randomUUID(), name: requiredText(name, "Group name"), createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO "Group" (id, name, createdAt) VALUES (?, ?, ?)').run(group.id, group.name, group.createdAt);
  return group;
}

export async function addMember(groupId: string, name: string, stripeAccountId?: string): Promise<Member> {
  const member: Member = { id: randomUUID(), groupId: requiredText(groupId, "Group ID"), name: requiredText(name, "Member name"), stripeAccountId: stripeAccountId?.trim() || null };
  db.prepare('INSERT INTO "Member" (id, groupId, name, stripeAccountId) VALUES (?, ?, ?, ?)').run(member.id, member.groupId, member.name, member.stripeAccountId);
  return member;
}

export async function getGroup(groupId: string): Promise<GroupWithMembers | null> {
  const group = db.prepare('SELECT id, name, createdAt FROM "Group" WHERE id = ?').get(groupId) as Group | undefined;
  if (!group) return null;
  const members = db.prepare('SELECT id, groupId, name, stripeAccountId FROM "Member" WHERE groupId = ? ORDER BY name').all(groupId) as Member[];
  return { group, members };
}
