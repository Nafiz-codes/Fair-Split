"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type MemberFormProps = {
  submitAction: (formData: FormData) => void | Promise<void>;
  inputClass: string;
};

export function MemberForm({ submitAction, inputClass }: MemberFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameIsInvalid = name.trim().length === 0;

  function handleSubmit(formData: FormData) {
    if (nameIsInvalid) return;

    startTransition(async () => {
      setServerError(null);

      try {
        await submitAction(formData);
        setName("");
        router.refresh();
      } catch (error) {
        setServerError(error instanceof Error ? error.message : "Unable to add this traveler.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-5 grid gap-5 sm:grid-cols-2">
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

      {serverError && (
        <p className="text-sm text-[var(--rust)] sm:col-span-2" role="alert">
          {serverError}
        </p>
      )}

      <button
        className="bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brass)] disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2"
        disabled={nameIsInvalid || isPending}
        type="submit"
      >
        {isPending ? "Adding traveler…" : "Add to ledger"}
      </button>
    </form>
  );
}
