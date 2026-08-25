"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSettlement, executeSettlement } from "@/app/actions/settlement";

type Props = { groupId: string; fromId: string; toId: string; amount: number };

export function SettlementButton({ groupId, fromId, toId, amount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function recordSettlement() {
    startTransition(async () => {
      setResult(null);
      try {
        const settlement = await createSettlement(groupId, fromId, toId, amount);
        const execution = await executeSettlement(settlement.id, fromId, toId, amount);
        setResult(execution.success
          ? { success: true, message: `Transfer complete: ${execution.transferId}` }
          : { success: false, message: execution.error });
        router.refresh();
      } catch (error) {
        setResult({ success: false, message: error instanceof Error ? error.message : "Unable to record settlement." });
      }
    });
  }

  if (result) {
    return <span className={`rounded-lg px-3 py-2 text-sm font-medium ${result.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{result.message}</span>;
  }

  return <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400" disabled={isPending} onClick={recordSettlement} type="button">{isPending ? "Processing transfer…" : "Record Settlement"}</button>;
}
