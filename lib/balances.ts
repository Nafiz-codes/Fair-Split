import type { Expense, Member } from "@/lib/types";

export function computeBalances(
  members: Member[],
  expenses: (Expense & { splitBetween: string[] })[],
): { memberId: string; name: string; amount: number }[] {
  const balances = new Map(members.map((member) => [member.id, 0]));

  for (const expense of expenses) {
    balances.set(expense.paidByMemberId, (balances.get(expense.paidByMemberId) ?? 0) + expense.amount);
    if (expense.splitBetween.length === 0) continue;
    const share = expense.amount / expense.splitBetween.length;
    for (const memberId of expense.splitBetween) {
      balances.set(memberId, (balances.get(memberId) ?? 0) - share);
    }
  }

  return members.map((member) => ({
    memberId: member.id,
    name: member.name,
    amount: Math.round((balances.get(member.id) ?? 0) * 100) / 100,
  }));
}

export function simplifyDebts(
  balances: { memberId: string; name: string; amount: number }[],
): { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] {
  const creditors = balances
    .filter((balance) => balance.amount > 0.01)
    .map((balance) => ({ ...balance, remaining: Math.round(balance.amount * 100) / 100 }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = balances
    .filter((balance) => balance.amount < -0.01)
    .map((balance) => ({ ...balance, remaining: Math.round(Math.abs(balance.amount) * 100) / 100 }))
    .sort((a, b) => b.remaining - a.remaining);
  const payments: { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Math.round(Math.min(creditor.remaining, debtor.remaining) * 100) / 100;

    if (amount >= 0.01) payments.push({ fromId: debtor.memberId, fromName: debtor.name, toId: creditor.memberId, toName: creditor.name, amount });

    creditor.remaining = Math.round((creditor.remaining - amount) * 100) / 100;
    debtor.remaining = Math.round((debtor.remaining - amount) * 100) / 100;
    if (creditor.remaining <= 0.01) creditorIndex += 1;
    if (debtor.remaining <= 0.01) debtorIndex += 1;
  }

  return payments;
}
