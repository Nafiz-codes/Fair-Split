"use server";

import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import type { Settlement } from "@/lib/types";

export interface SettlementWithNames extends Settlement {
  fromMemberName: string;
  toMemberName: string;
}

export async function createSettlement(groupId: string, fromMemberId: string, toMemberId: string, amount: number): Promise<Settlement> {
  if (!groupId || !fromMemberId || !toMemberId) throw new Error("Settlement members and group are required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Settlement amount must be greater than zero.");

  const settlement: Settlement = { id: randomUUID(), groupId, fromMemberId, toMemberId, amount: Math.round(amount * 100) / 100, stripeTransferId: null, status: "pending", createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO "Settlement" (id, groupId, fromMemberId, toMemberId, amount, stripeTransferId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(settlement.id, settlement.groupId, settlement.fromMemberId, settlement.toMemberId, settlement.amount, settlement.stripeTransferId, settlement.status, settlement.createdAt);
  return settlement;
}

export async function getSettlements(groupId: string): Promise<SettlementWithNames[]> {
  return db.prepare(`
    SELECT s.id, s.groupId, s.fromMemberId, s.toMemberId, s.amount, s.stripeTransferId, s.status, s.createdAt,
           payer.name AS fromMemberName, payee.name AS toMemberName
    FROM "Settlement" s
    JOIN "Member" payer ON payer.id = s.fromMemberId
    JOIN "Member" payee ON payee.id = s.toMemberId
    WHERE s.groupId = ?
    ORDER BY s.createdAt DESC
  `).all(groupId) as SettlementWithNames[];
}
