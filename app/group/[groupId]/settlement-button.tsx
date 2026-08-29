"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSettlement, executeSettlement } from "@/app/actions/settlement";

type Props = { groupId: string; fromId: string; toId: string; amount: number };

export function SettlementButton({ groupId, fromId, toId, amount }: Props) {
  const router = useRouter();
  const submissionLock = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [hasStarted, setHasStarted] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function recordSettlement() {
    if (submissionLock.current) return;

    // A ref updates synchronously, closing the double-click window before React rerenders.
    submissionLock.current = true;
    setHasStarted(true);

    startTransition(async () => {
      setResult(null);
      try {
        const settlement = await createSettlement(groupId, fromId, toId, amount);
        const execution = await executeSettlement(settlement.id, fromId, toId, amount);
        setResult(execution.success
          ? { success: true, message: `Transfer complete: ${execution.transferId}` }
          : { success: false, message: execution.error });

        if (!execution.success) {
          submissionLock.current = false;
          setHasStarted(false);
        }

        router.refresh();
      } catch (error) {
        setResult({ success: false, message: error instanceof Error ? error.message : "Unable to record settlement." });
        submissionLock.current = false;
        setHasStarted(false);
      }
    });
  }

  if (result) {
    if (result.success) {
      return (
        <span className="stamp font-receipt max-w-[150px] break-all px-2 py-1 text-[9px] text-[var(--sage)]">
          {result.message}
        </span>
      );
    }

    return (
      <p className="settlement-error max-w-[190px] px-3 py-2 text-xs leading-5" role="alert">
        <span className="block font-semibold">Stripe transfer failed</span>
        <span className="mt-1 block">{result.message}</span>
      </p>
    );
  }

  return <button className="border border-[var(--ink)] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--brass)] hover:bg-[var(--brass)] hover:text-white disabled:cursor-wait disabled:opacity-60" disabled={isPending || hasStarted} onClick={recordSettlement} type="button">{isPending || hasStarted ? "Processing…" : "Record"}</button>;
}
