"use client";
import { useEffect, useState } from "react";
type CountUpProps = { value: number; prefix?: string; suffix?: string; decimals?: number; className?: string };
export function CountUp({ value, prefix = "", suffix = "", decimals = 2, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; } const start = performance.now(); let frame = 0; const animate = (now: number) => { const progress = Math.min((now - start) / 650, 1); setDisplay(value * (1 - (1 - progress) ** 3)); if (progress < 1) frame = requestAnimationFrame(animate); }; frame = requestAnimationFrame(animate); return () => cancelAnimationFrame(frame); }, [value]);
  return <span className={className}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}
