import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, IndianRupee, PackageCheck, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/app/Shell";
import { EmptyState, MetricCard, PageHeader, PriorityBadge } from "@/components/app/bits";
import { orchestrate } from "@/lib/agents";
import { inr, round } from "@/lib/intelligence";

export const Route = createFileRoute("/reorder")({
  head: () => ({
    meta: [
      { title: "Smart Reorder Center — StockPilot AI" },
      {
        name: "description",
        content:
          "Recommended purchase quantities with lead time, safety stock and a transparent explanation for every SKU.",
      },
      { property: "og:title", content: "Smart Reorder Center — StockPilot AI" },
      { property: "og:description", content: "A prioritised purchase plan generated from coverage and lead-time maths." },
    ],
  }),
  component: ReorderCenter,
});

function ReorderCenter() {
  const o = useMemo(() => orchestrate(), []);
  const [planGenerated, setPlanGenerated] = useState(false);

  const lines = o.reorder.lines;
  const urgent = lines.filter((l) => l.urgency === "CRITICAL" || l.urgency === "HIGH");

  return (
    <Shell require="reorder.manage">
      <PageHeader
        eyebrow="Smart Reorder Agent"
        title="Smart Reorder Center"
        description="Order quantity = forecast demand across lead time plus a two-week cover window, plus safety stock, minus stock on hand. Every line shows the maths."
        actions={
          <button
            onClick={() => {
              setPlanGenerated(true);
              toast.success("Purchase plan generated", {
                description: `${lines.length} lines · ${inr(o.reorder.totalCost)} total, prioritised by urgency.`,
              });
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
          >
            <ClipboardList className="size-3.5" /> Generate purchase plan
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Urgent SKUs" value={`${urgent.length}`} sub="Critical or high urgency" icon={Timer} tone="critical" />
        <MetricCard label="Recommended lines" value={`${lines.length}`} sub="Across all suppliers" icon={PackageCheck} delay={60} />
        <MetricCard label="Purchase value" value={inr(o.reorder.totalCost, true)} sub="At supplier cost" icon={IndianRupee} tone="accent" delay={120} />
        <MetricCard
          label="Revenue protected"
          value={inr(urgent.reduce((s, l) => s + l.product.avgDaily * l.product.leadTimeDays * l.product.price, 0), true)}
          sub="Lead-time sales at risk without action"
          icon={PackageCheck}
          tone="positive"
          delay={180}
        />
      </section>

      {planGenerated ? (
        <section className="panel animate-rise p-5">
          <p className="text-sm font-semibold text-foreground">Prioritised purchase plan</p>
          <p className="text-xs text-muted-foreground">
            Grouped by supplier so orders can be raised in a single call each.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(new Set(lines.map((l) => l.product.supplier.name))).map((supplier) => {
              const supplierLines = lines.filter((l) => l.product.supplier.name === supplier);
              return (
                <div key={supplier} className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="text-xs font-semibold text-foreground">{supplier}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {supplierLines.length} lines · {inr(supplierLines.reduce((s, l) => s + l.cost, 0))}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {supplierLines.map((l) => (
                      <li key={l.product.sku} className="num flex justify-between text-[11px] text-muted-foreground">
                        <span className="truncate pr-2 text-foreground/85">{l.product.name}</span>
                        <span>{l.quantity} u</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {lines.length === 0 ? (
        <EmptyState title="Nothing to reorder right now" description="No SKU is within its reorder window at current forecast demand." />
      ) : (
        <section className="space-y-4">
          {lines.map((l) => (
            <article key={l.product.sku} className="panel animate-rise p-5">
              <div className="flex flex-wrap items-center gap-3">
                <PriorityBadge priority={l.urgency} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{l.product.name}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {l.product.sku} · {l.product.supplier.name}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="num text-lg font-semibold text-primary">{l.quantity} units</p>
                  <p className="num text-[11px] text-muted-foreground">{inr(l.cost)} estimated cost</p>
                </div>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
                <Cell label="Current stock" value={`${l.product.stock} u`} />
                <Cell label="Avg daily sales" value={`${l.product.avgDaily}/day`} />
                <Cell label="Days remaining" value={`${round(l.product.daysRemaining, 1)} d`} tone={l.product.daysRemaining <= l.product.leadTimeDays ? "critical" : undefined} />
                <Cell label="Reorder point" value={`${l.product.computedReorderPoint} u`} />
                <Cell label="Lead time" value={`${l.product.leadTimeDays} d`} />
                <Cell label="Safety stock" value={`${l.product.safetyStock} u`} />
              </dl>

              <p className="mt-4 rounded-lg border border-primary/25 bg-primary/8 p-3 text-xs leading-relaxed text-muted-foreground">
                {l.explanation}
              </p>
            </article>
          ))}
        </section>
      )}
    </Shell>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "critical" | undefined }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className={`num mt-0.5 text-sm font-medium ${tone === "critical" ? "text-critical" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}
