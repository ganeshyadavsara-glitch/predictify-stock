import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Timer, Truck } from "lucide-react";
import { useMemo } from "react";

import { Shell } from "@/components/app/Shell";
import { MetricCard, PageHeader } from "@/components/app/bits";
import { SUPPLIERS } from "@/data/catalog";
import { getProducts, inr, round } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Supplier Intelligence — StockPilot AI" },
      {
        name: "description",
        content: "Lead time, reliability and purchase exposure per supplier — the inputs behind every reorder recommendation.",
      },
      { property: "og:title", content: "Supplier Intelligence — StockPilot AI" },
      { property: "og:description", content: "How supplier lead time and reliability shape inventory risk." },
    ],
  }),
  component: SupplierPage,
});

function SupplierPage() {
  const products = useMemo(() => getProducts(), []);

  const rows = SUPPLIERS.map((s) => {
    const items = products.filter((p) => p.supplier.id === s.id);
    const atRisk = items.filter((p) => p.stockoutRisk >= 65);
    return {
      supplier: s,
      skus: items.length,
      value: items.reduce((sum, p) => sum + p.inventoryValue, 0),
      monthlyPurchase: items.reduce((sum, p) => sum + p.avgDaily * 30 * p.cost, 0),
      atRisk: atRisk.length,
      avgCover: round(items.reduce((sum, p) => sum + Math.min(60, p.daysRemaining), 0) / Math.max(1, items.length), 1),
    };
  }).sort((a, b) => b.value - a.value);

  const slowest = [...SUPPLIERS].sort((a, b) => b.leadTimeDays - a.leadTimeDays)[0]!;
  const leastReliable = [...SUPPLIERS].sort((a, b) => a.reliability - b.reliability)[0]!;

  return (
    <Shell>
      <PageHeader
        eyebrow="Supply chain"
        title="Supplier Intelligence"
        description="Lead time and reliability drive safety stock and reorder timing. A slow, unreliable supplier makes the same SKU far riskier than a fast one."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Suppliers" value={`${SUPPLIERS.length}`} sub="Active in the catalogue" icon={Truck} />
        <MetricCard label="Longest lead time" value={`${slowest.leadTimeDays} days`} sub={slowest.name} icon={Timer} tone="warning" delay={60} />
        <MetricCard label="Lowest reliability" value={`${leastReliable.reliability}%`} sub={`${leastReliable.name} · ${leastReliable.avgDeliveryDays}d avg delivery`} icon={Gauge} tone="critical" delay={120} />
        <MetricCard
          label="Monthly purchase volume"
          value={inr(rows.reduce((s, r) => s + r.monthlyPurchase, 0), true)}
          sub="At current demand run-rate"
          icon={Truck}
          tone="accent"
          delay={180}
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <article key={r.supplier.id} className="panel animate-rise p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{r.supplier.name}</p>
                <p className="num text-[11px] text-muted-foreground">{r.supplier.id} · {r.skus} SKUs</p>
              </div>
              <span
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-semibold",
                  r.supplier.reliability >= 90
                    ? "border-success/40 bg-success/10 text-success"
                    : r.supplier.reliability >= 85
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-critical/40 bg-critical/10 text-critical",
                )}
              >
                {r.supplier.reliability}% reliable
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <Row label="Lead time" value={`${r.supplier.leadTimeDays} days`} />
              <Row label="Avg delivery" value={`${r.supplier.avgDeliveryDays} days`} />
              <Row label="Inventory value" value={inr(r.value, true)} />
              <Row label="Monthly purchase" value={inr(r.monthlyPurchase, true)} />
              <Row label="Avg cover" value={`${r.avgCover} d`} />
              <Row label="SKUs at risk" value={`${r.atRisk}`} tone={r.atRisk > 0 ? "critical" : undefined} />
            </dl>

            <p className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Safety stock for this supplier is inflated by {Math.round(100 - r.supplier.reliability)}% to absorb the gap between
              a {r.supplier.leadTimeDays}-day quoted lead time and a {r.supplier.avgDeliveryDays}-day actual average.
            </p>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "critical" }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-border/60 pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`num font-medium ${tone === "critical" ? "text-critical" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}
