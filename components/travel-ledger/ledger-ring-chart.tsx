"use client";

type RingDatum = { label: string; value: number; color: string };

export function LedgerRingChart({ data, total }: { data: RingDatum[]; total: number }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg
          aria-label="Expense category breakdown"
          className="h-32 w-32 -rotate-90"
          viewBox="0 0 100 100"
        >
          {data.map((item, index) => {
            // Tighter spacing keeps the innermost ring farther from the center label.
            const radius = 42 - index * 5;
            const circle = 2 * Math.PI * radius;

            return (
              <g key={item.label}>
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r={radius}
                  stroke="var(--border)"
                  strokeWidth="4"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r={radius}
                  stroke={item.color}
                  strokeDasharray={`${(item.value / max) * circle} ${circle}`}
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <strong className="amount font-serif text-xl font-bold leading-none text-[var(--ink)]">
            ${total.toFixed(0)}
          </strong>
          <span className="mt-1 text-[10px] uppercase tracking-widest text-[var(--slate)]">
            Spent
          </span>
        </div>
      </div>

      <ul className="min-w-0 space-y-2">
        {data.map((item) => (
          <li className="flex items-center justify-between gap-4 text-xs" key={item.label}>
            <span className="flex min-w-0 items-center gap-2 text-[var(--slate)]">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
              {item.label}
            </span>
            <span className="amount text-[var(--ink)]">${item.value.toFixed(0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
