import React from "react";
import { cn } from "@/lib/utils";

interface StatBlockProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  highlight?: boolean;
  className?: string;
}

export function StatBlock({
  icon,
  label,
  value,
  sub,
  accent,
  highlight,
  className,
}: StatBlockProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center space-y-1.5 w-full", className)}>
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cn(`text-2xl font-bold tracking-tight ${accent
          ? ""
          : highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-foreground"
          }`, className)}
        style={accent ? { color: "hsl(var(--primary))" } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
