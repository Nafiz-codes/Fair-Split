"use server";

import { randomUUID } from "node:crypto";
import db from "@/lib/db";
import { assertStripeConfigured, stripe } from "@/lib/stripe";
import type { Settlement } from "@/lib/types";

export interface SettlementWithNames extends Settlement {
  fromMemberName: string;
  toMemberName: string;
}

export type SettlementExecutionResult =
  | { success: true; transferId: string }
  | { success: false; error: string };

export async function createSettlement(groupId: string, fromMemberId: string, toMemberId: string, amount: number): Promise<Settlement> {
  if (!groupId || !fromMemberId || !toMemberId) throw new Error("Settlement members and group are required.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Settlement amount must be greater than zero.");

  const settlement: Settlement = { id: randomUUID(), groupId, fromMemberId, toMemberId, amount: Math.round(amount * 100) / 100, stripeTransferId: null, status: "pending", createdAt: new Date().toISOString() };
  await db.prepare('INSERT INTO "Settlement" (id, groupId, fromMemberId, toMemberId, amount, stripeTransferId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(settlement.id, settlement.groupId, settlement.fromMemberId, settlement.toMemberId, settlement.amount, settlement.stripeTransferId, settlement.status, settlement.createdAt);
  return settlement;
}

export async function executeSettlement(
  settlementId: string,
  fromMemberId: string,
  toMemberId: string,
  amount: number,
): Promise<SettlementExecutionResult> {
  try {
    assertStripeConfigured();

    const recipient = await db
      .prepare('SELECT stripeAccountId FROM "Member" WHERE id = ?')
      .get<{ stripeAccountId: string | null }>(toMemberId);

    if (!recipient?.stripeAccountId) {
      throw new Error("The receiving member does not have a Stripe account ID.");
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      destination: recipient.stripeAccountId,
      source_type: "card",
      metadata: { settlementId, fromMemberId, toMemberId },
    });

    await db.prepare('UPDATE "Settlement" SET status = ?, stripeTransferId = ? WHERE id = ?').run(
      "complete",
      transfer.id,
      settlementId,
    );

    return { success: true, transferId: transfer.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe transfer failed.";
    await db.prepare('UPDATE "Settlement" SET status = ? WHERE id = ?').run("failed", settlementId);
    return { success: false, error: message };
  }
}

export async function getSettlements(groupId: string): Promise<SettlementWithNames[]> {
  return await db.prepare(`
    SELECT s.id, s.groupId, s.fromMemberId, s.toMemberId, s.amount, s.stripeTransferId, s.status, s.createdAt,
           payer.name AS fromMemberName, payee.name AS toMemberName
    FROM "Settlement" s
    JOIN "Member" payer ON payer.id = s.fromMemberId
    JOIN "Member" payee ON payee.id = s.toMemberId
    WHERE s.groupId = ?
    ORDER BY s.createdAt DESC
  `).all<SettlementWithNames>(groupId);
}
