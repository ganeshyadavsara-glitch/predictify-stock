import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Layers, Recycle, Wallet } from "lucide-react";
import { useMemo } from "react";

import { Shell } from "@/components/app/Shell";
import { ActionCard, EmptyState, MetricCard, PageHeader } from "@/components/app/bits";
import { orchestrate } from "@/lib/agents";
import { inr } from "@/lib/intelligence";

export const Route = createFileRoute("/dead-stock")({
  head: () => ({
    meta: [
      { title: "Dead Stock Intelligence — StockPilot AI" },
      {
        name: "description",
        content: "Find non-moving inventory, see exactly how much capital it traps and get a clearance recommendation per SKU.",
      },
      { property: "og:title", content: "Dead Stock Intelligence — StockPilot AI" },
      { property: "og:description", content: "Capital trapped in slow inventory, with recommended clearance actions." },
    ],
  }),
  component: DeadStockPage,
});

function DeadStockPage() {
  const o = useMemo(() => orchestrate(), []);
  const { items, totalValue, avgDaysWithoutMovement } = o.deadstock;

  return (
    <Shell>
      <PageHeader
        eyebrow="Dead Stock Agent"
        title="Dead Stock Intelligence"
        description="Inventory that has stopped moving, or is moving so slowly that its cover window has become meaningless. Every rupee here is capital you cannot deploy."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dead stock value" value={inr(totalValue, true)} sub="Capital tied up at cost" icon={Wallet} tone="critical" />
        <MetricCard label="Dead SKUs" value={`${items.length}`} sub="Flagged by movement + cover" icon={Recycle} tone="warning" delay={60} />
        <MetricCard label="Avg idle days" value={`${avgDaysWithoutMovement} d`} sub="Since last recorded movement" icon={Clock} delay={120} />
        <MetricCard
          label="Units held"
          value={`${items.reduce((s, p) => s + p.stock, 0)}`}
          sub="Across all flagged SKUs"
          icon={Layers}
          delay={180}
        />
      </section>

      {items.length === 0 ? (
        <EmptyState title="No dead stock detected" description="Every SKU has moved recently and sits inside a healthy cover window." />
      ) : (
        <>
          <section className="panel animate-rise overflow-hidden">
            <div className="border-b border-border/70 px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">Top dead-stock products</p>
              <p className="text-xs text-muted-foreground">Ranked by capital locked</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {["Product", "Units", "Days idle", "Daily sales", "Cover", "Capital locked"].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.sku} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-3 pl-5">
                        <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-medium text-foreground hover:text-primary">
                          {p.name}
                        </Link>
                        <p className="num text-[11px] text-muted-foreground">{p.sku} · {p.category}</p>
                      </td>
                      <td className="num px-3 py-3">{p.stock}</td>
                      <td className="num px-3 py-3 text-warning">{p.lastMovementDaysAgo}</td>
                      <td className="num px-3 py-3">{p.avgDaily}</td>
                      <td className="num px-3 py-3">{p.overstockDays} d</td>
                      <td className="num px-3 py-3 pr-5 font-semibold text-critical">{inr(p.inventoryValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            {o.deadstock.findings.map((f) => (
              <ActionCard key={f.id} finding={f} />
            ))}
          </section>
        </>
      )}
    </Shell>
  );
}
