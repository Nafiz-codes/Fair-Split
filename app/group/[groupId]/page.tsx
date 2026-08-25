import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { addExpense, getExpenses } from "@/app/actions/expense";
import { addMember, getGroup } from "@/app/actions/group";
import { getSettlements } from "@/app/actions/settlement";
import { computeBalances, simplifyDebts } from "@/lib/balances";
import { SettlementButton } from "./settlement-button";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export default async function GroupPage({ params }: { params: { groupId: string } }) {
  const result = await getGroup(params.groupId);
  if (!result) notFound();
  const { group, members } = result;
  const expenses = await getExpenses(group.id);
  const balances = computeBalances(members, expenses.map((expense) => ({ ...expense, splitBetween: expense.splitBetween.map((member) => member.id) })));
  const suggestedPayments = simplifyDebts(balances);
  const settlements = await getSettlements(group.id);

  async function addMemberFromForm(formData: FormData) {
    "use server";
    await addMember(group.id, String(formData.get("name") ?? ""), String(formData.get("stripeAccountId") ?? ""));
    revalidatePath(`/group/${group.id}`);
  }

  async function addExpenseFromForm(formData: FormData) {
    "use server";
    await addExpense(group.id, String(formData.get("paidByMemberId") ?? ""), Number(formData.get("amount")), String(formData.get("description") ?? ""), formData.getAll("splitBetweenMemberIds").map(String));
    revalidatePath(`/group/${group.id}`);
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6"><div className="mx-auto max-w-3xl space-y-6">
    <header className="rounded-2xl bg-indigo-600 p-7 text-white shadow-sm sm:p-9"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">Expense group</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{group.name}</h1></header>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><div className="flex items-baseline justify-between gap-4"><h2 className="text-xl font-bold">Members</h2><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">{members.length} {members.length === 1 ? "member" : "members"}</span></div>{members.length === 0 ? <p className="mt-6 rounded-lg bg-slate-50 p-4 text-slate-600">Add the first member below.</p> : <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{members.map((member) => <li className="flex items-center justify-between gap-4 p-4" key={member.id}><span className="font-medium">{member.name}</span>{member.stripeAccountId && <span className="text-sm text-slate-500">{member.stripeAccountId}</span>}</li>)}</ul>}</section>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><h2 className="text-xl font-bold">Add a member</h2><form action={addMemberFromForm} className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700" htmlFor="name">Name<input className={fieldClass} id="name" name="name" placeholder="Taylor" required /></label><label className="text-sm font-medium text-slate-700" htmlFor="stripeAccountId">Stripe account ID<input className={fieldClass} id="stripeAccountId" name="stripeAccountId" placeholder="acct_…" /></label><button className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 sm:col-span-2" type="submit">Add member</button></form></section>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><h2 className="text-xl font-bold">Add expense</h2>{members.length === 0 ? <p className="mt-4 text-slate-600">Add at least one member before recording an expense.</p> : <form action={addExpenseFromForm} className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700" htmlFor="description">Description<input className={fieldClass} id="description" name="description" placeholder="Dinner" required /></label><label className="text-sm font-medium text-slate-700" htmlFor="amount">Amount<input className={fieldClass} id="amount" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2" htmlFor="paidByMemberId">Paid by<select className={`${fieldClass} bg-white`} id="paidByMemberId" name="paidByMemberId" required><option value="">Choose a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><fieldset className="sm:col-span-2"><legend className="text-sm font-medium text-slate-700">Split between</legend><div className="mt-2 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">{members.map((member) => <label className="flex items-center gap-2 text-sm" key={member.id}><input defaultChecked name="splitBetweenMemberIds" type="checkbox" value={member.id} />{member.name}</label>)}</div></fieldset><button className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 sm:col-span-2" type="submit">Add expense</button></form>}</section>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><h2 className="text-xl font-bold">Expenses</h2>{expenses.length === 0 ? <p className="mt-4 text-slate-600">No expenses yet.</p> : <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{expenses.map((expense) => <li className="flex items-center justify-between gap-4 p-4" key={expense.id}><div><p className="font-medium">{expense.description}</p><p className="mt-1 text-sm text-slate-500">Paid by {expense.paidByName} · Split between {expense.splitBetween.length} {expense.splitBetween.length === 1 ? "person" : "people"}</p></div><span className="font-semibold">${expense.amount.toFixed(2)}</span></li>)}</ul>}</section>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><h2 className="text-xl font-bold">Balances</h2>{members.length === 0 ? <p className="mt-4 text-slate-600">Balances will appear after members are added.</p> : <ul className="mt-5 space-y-3">{balances.map((balance) => <li className="rounded-lg bg-slate-50 p-4" key={balance.memberId}>{balance.amount > 0 ? <span className="font-medium text-emerald-700">{balance.name} is owed ${balance.amount.toFixed(2)}</span> : balance.amount < 0 ? <span className="font-medium text-red-600">{balance.name} owes ${Math.abs(balance.amount).toFixed(2)}</span> : <span className="font-medium text-slate-600">{balance.name} is settled up</span>}</li>)}</ul>}</section>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><h2 className="text-xl font-bold">Settle Up</h2>{suggestedPayments.length === 0 ? <p className="mt-4 text-slate-600">Everyone is settled up.</p> : <div className="mt-5 space-y-3">{suggestedPayments.map((payment) => <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4" key={`${payment.fromId}-${payment.toId}-${payment.amount}`}><p className="font-medium">{payment.fromName} pays {payment.toName} ${payment.amount.toFixed(2)}</p><SettlementButton amount={payment.amount} fromId={payment.fromId} groupId={group.id} toId={payment.toId} /></div>)}</div>}</section>

    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"><h2 className="text-xl font-bold">Settlement History</h2>{settlements.length === 0 ? <p className="mt-4 text-slate-600">No settlements have been recorded.</p> : <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">{settlements.map((settlement) => <li className="flex items-center justify-between gap-4 p-4" key={settlement.id}><div><p className="font-medium">{settlement.fromMemberName} pays {settlement.toMemberName}</p><p className="mt-1 text-sm text-slate-500">{settlement.status}</p></div><span className="font-semibold">${settlement.amount.toFixed(2)}</span></li>)}</ul>}</section>
  </div></main>;
}
