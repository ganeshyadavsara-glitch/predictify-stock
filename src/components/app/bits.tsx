import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Finding, Priority } from "@/lib/agents";
import type { RiskLevel, StockStatus } from "@/lib/intelligence";
import { inr } from "@/lib/intelligence";

/* ---------------- headings ---------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="animate-rise flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/* ---------------- badges ---------------- */

const priorityStyles: Record<Priority, string> = {
  CRITICAL: "bg-critical/15 text-critical border-critical/40",
  HIGH: "bg-warning/15 text-warning border-warning/40",
  MEDIUM: "bg-info/15 text-info border-info/40",
  LOW: "bg-muted text-muted-foreground border-border",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        priorityStyles[priority],
        className,
      )}
    >
      {priority === "CRITICAL" ? (
        <span className="relative flex size-1.5">
          <span className="pulse-dot absolute inline-flex size-1.5 rounded-full bg-critical" />
          <span className="relative inline-flex size-1.5 rounded-full bg-critical" />
        </span>
      ) : null}
      {priority}
    </span>
  );
}

const statusStyles: Record<StockStatus, string> = {
  Critical: "bg-critical/15 text-critical border-critical/40",
  "Low Stock": "bg-warning/15 text-warning border-warning/40",
  "Expiring Soon": "bg-accent/15 text-accent border-accent/40",
  "Dead Stock": "bg-critical/10 text-critical/85 border-critical/25",
  Overstock: "bg-info/15 text-info border-info/35",
  Watch: "bg-muted text-muted-foreground border-border",
  Healthy: "bg-success/15 text-success border-success/35",
};

export function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}

const riskStyles: Record<RiskLevel, string> = {
  critical: "text-critical",
  high: "text-warning",
  medium: "text-info",
  low: "text-muted-foreground",
  none: "text-success",
};

export function RiskMeter({ value, level, label }: { value: number; level: RiskLevel; label?: string }) {
  const barTone =
    level === "critical" ? "bg-critical" : level === "high" ? "bg-warning" : level === "medium" ? "bg-info" : "bg-success";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label ?? "Risk"}</span>
        <span className={cn("num font-semibold", riskStyles[level])}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", barTone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function TrendPill({ pct }: { pct: number }) {
  const Icon = pct >= 8 ? TrendingUp : pct <= -8 ? TrendingDown : Minus;
  const tone = pct >= 8 ? "text-success" : pct <= -8 ? "text-critical" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="size-3.5" />
      <span className="num">
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>
    </span>
  );
}

/* ---------------- metric card ---------------- */

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "neutral" | "critical" | "warning" | "positive" | "accent";
  delay?: number;
}) {
  const toneRing = {
    neutral: "text-muted-foreground bg-muted",
    critical: "text-critical bg-critical/12",
    warning: "text-warning bg-warning/12",
    positive: "text-success bg-success/12",
    accent: "text-accent bg-accent/12",
  }[tone];

  return (
    <div
      className="panel animate-rise group relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", toneRing)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="num mt-4 text-2xl font-semibold text-foreground md:text-[1.7rem]">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/* ---------------- finding / action card ---------------- */

export function ActionCard({ finding, rank }: { finding: Finding; rank?: number }) {
  return (
    <article className="panel animate-rise overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-5 py-3.5">
        {rank ? (
          <span className="num grid size-7 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
            {rank}
          </span>
        ) : null}
        <PriorityBadge priority={finding.priority} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{finding.product}</p>
          <p className="num text-[11px] text-muted-foreground">
            {finding.sku} · {finding.category}
          </p>
        </div>
        <span className="rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {finding.actionType}
        </span>
      </div>

      <div className="space-y-4 px-5 py-4">
        <Field label="Problem detected">{finding.problem}</Field>

        <div>
          <FieldLabel>Evidence</FieldLabel>
          <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {finding.evidence.map((e) => (
              <div key={e.label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1">
                <dt className="text-xs text-muted-foreground">{e.label}</dt>
                <dd className="num text-xs font-medium text-foreground">{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border border-primary/25 bg-primary/8 p-3.5">
          <FieldLabel className="text-primary">AI recommendation</FieldLabel>
          <p className="mt-1 text-sm font-medium text-foreground">{finding.action}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{finding.reasoning}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <FieldLabel>Expected impact</FieldLabel>
            <p className="mt-0.5 text-xs text-muted-foreground">{finding.impact}</p>
          </div>
          <div className="text-right">
            <p className="num text-base font-semibold text-primary">{inr(finding.impactValue, true)}</p>
            <p className="text-[11px] text-muted-foreground">value at stake</p>
          </div>
        </div>

        <Link
          to="/inventory/$sku"
          params={{ sku: finding.sku }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-glow"
        >
          Open product intelligence <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="panel grid place-items-center px-6 py-14 text-center">
      <div className="max-w-sm space-y-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}