"use client";

import { useState } from "react";

type MemberFormProps = {
  submitAction: (formData: FormData) => void | Promise<void>;
  inputClass: string;
};

export function MemberForm({ submitAction, inputClass }: MemberFormProps) {
  const [name, setName] = useState("");
  const nameIsInvalid = name.trim().length === 0;

  return (
    <form action={submitAction} className="mt-5 grid gap-5 sm:grid-cols-2">
      <label className="text-sm">
        Name
        <input
          aria-describedby={nameIsInvalid ? "traveler-name-error" : undefined}
          className={inputClass}
          name="name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Taylor"
          required
        />
        {nameIsInvalid && (
          <span className="mt-2 block text-xs text-[var(--rust)]" id="traveler-name-error">
            Enter a traveler name
          </span>
        )}
      </label>

      <label className="text-sm">
        Stripe account ID
        <input className={`${inputClass} font-receipt`} name="stripeAccountId" placeholder="acct_…" />
      </label>

      <button
        className="bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brass)] disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2"
        disabled={nameIsInvalid}
        type="submit"
      >
        Add to ledger
      </button>
    </form>
  );
}
