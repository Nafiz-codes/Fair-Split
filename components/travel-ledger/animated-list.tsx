"use client";
import type { ReactNode } from "react";
export function AnimatedList({ children }: { children: ReactNode[] }) { return <div className="space-y-0">{children.map((child, index) => <div className="ledger-list-item" key={index} style={{ animationDelay: `${index * 55}ms` }}>{child}</div>)}</div>; }
