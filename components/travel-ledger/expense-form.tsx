"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";

type ExpenseFormProps = {
  members: Member[];
  submitAction: (formData: FormData) => void | Promise<void>;
  inputClass: string;
};

export function ExpenseForm({ members, submitAction, inputClass }: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidByMemberId, setPaidByMemberId] = useState("");
  const [splitMemberIds, setSplitMemberIds] = useState(() => new Set(members.map((member) => member.id)));
  const amountIsInvalid = !Number.isFinite(Number(amount)) || Number(amount) <= 0;
  const descriptionIsInvalid = description.trim().length === 0;
  const payerIsInvalid = paidByMemberId.length === 0;
  const splitIsInvalid = splitMemberIds.size === 0;
  const isInvalid = amountIsInvalid || descriptionIsInvalid || payerIsInvalid || splitIsInvalid;

  function toggleSplitMember(memberId: string, checked: boolean) {
    setSplitMemberIds((current) => {
      const next = new Set(current);
      if (checked) next.add(memberId);
      else next.delete(memberId);
      return next;
    });
  }

  return (
    <form action={submitAction} className="ledger-card mt-4 grid gap-5 p-5 sm:grid-cols-2">
      <label className="text-sm">
        Description
        <input
          aria-describedby={descriptionIsInvalid ? "expense-description-error" : undefined}
          className={inputClass}
          name="description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Dinner at Bukhara"
          required
        />
        {descriptionIsInvalid && (
          <span className="mt-2 block text-xs text-[var(--rust)]" id="expense-description-error">
            Enter an expense description
          </span>
        )}
      </label>

      <label className="text-sm">
        Amount
        <input
          aria-describedby={amountIsInvalid ? "expense-amount-error" : undefined}
          className={`${inputClass} amount`}
          min="0.01"
          name="amount"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          required
          step="0.01"
          type="number"
        />
        {amountIsInvalid && (
          <span className="mt-2 block text-xs text-[var(--rust)]" id="expense-amount-error">
            Enter an amount greater than $0
          </span>
        )}
      </label>

      <label className="text-sm sm:col-span-2">
        Paid by
        <select
          aria-describedby={payerIsInvalid ? "expense-payer-error" : undefined}
          className={inputClass}
          name="paidByMemberId"
          onChange={(event) => setPaidByMemberId(event.target.value)}
          required
        >
          <option value="">Choose a traveler</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        {payerIsInvalid && (
          <span className="mt-2 block text-xs text-[var(--rust)]" id="expense-payer-error">
            Choose a traveler who paid
          </span>
        )}
      </label>

      <fieldset className="sm:col-span-2">
        <legend className="text-sm">Split between</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {members.map((member) => (
            <label className="flex items-center gap-2 text-sm" key={member.id}>
              <input
                checked={splitMemberIds.has(member.id)}
                name="splitBetweenMemberIds"
                onChange={(event) => toggleSplitMember(member.id, event.target.checked)}
                type="checkbox"
                value={member.id}
              />
              {member.name}
            </label>
          ))}
        </div>
        {splitIsInvalid && (
          <span className="mt-3 block text-xs text-[var(--rust)]">
            Select at least one traveler to split with
          </span>
        )}
      </fieldset>

      <button
        className="bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brass)] disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2"
        disabled={isInvalid}
        type="submit"
      >
        File receipt →
      </button>
    </form>
  );
}
