"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getMemberRemovalPreview,
  removeMember,
  type MemberRemovalPreview,
} from "@/app/actions/group";

type RemoveMemberButtonProps = {
  memberId: string;
  memberName: string;
};

export function RemoveMemberButton({ memberId, memberName }: RemoveMemberButtonProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<MemberRemovalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function checkRemoval() {
    startTransition(async () => {
      setError(null);

      try {
        const result = await getMemberRemovalPreview(memberId);

        if (!result.canRemove) {
          setError(result.error ?? "This traveler cannot be removed.");
          return;
        }

        setPreview(result);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to check this traveler.");
      }
    });
  }

  function confirmRemoval() {
    startTransition(async () => {
      setError(null);

      try {
        await removeMember(memberId);
        router.refresh();
      } catch (caughtError) {
        setPreview(null);
        setError(caughtError instanceof Error ? caughtError.message : "Unable to remove this traveler.");
      }
    });
  }

  return (
    <div className="mt-4 border-t pt-3 ledger-rule">
      {preview ? (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-[var(--rust)]" role="alert">
            Removing {preview.memberName} will also delete {preview.removedExpenseCount} expense(s) they paid for. This may change other travelers&apos; balances. Continue?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[var(--ink)]"
              disabled={isPending}
              onClick={() => setPreview(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="bg-[var(--rust)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={isPending}
              onClick={confirmRemoval}
              type="button"
            >
              {isPending ? "Removing…" : "Confirm removal"}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="text-xs font-semibold text-[var(--rust)] underline decoration-dotted underline-offset-4 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isPending}
          onClick={checkRemoval}
          type="button"
        >
          {isPending ? "Checking…" : `Remove ${memberName}`}
        </button>
      )}
      {error && (
        <p className="mt-3 text-xs leading-5 text-[var(--rust)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
