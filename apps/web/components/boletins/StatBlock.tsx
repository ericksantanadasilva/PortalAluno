import React from "react";

interface StatBlockProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  highlight?: boolean;
}

export function StatBlock({
  icon,
  label,
  value,
  sub,
  accent,
  highlight,
}: StatBlockProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold tracking-tight ${
          accent
            ? ""
            : highlight
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-foreground"
        }`}
        style={accent ? { color: "hsl(var(--primary))" } : undefined}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
