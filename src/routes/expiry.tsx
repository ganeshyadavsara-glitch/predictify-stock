import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertOctagon, CalendarClock, PackageX, TrendingDown } from "lucide-react";
import { useMemo } from "react";

import { Shell } from "@/components/app/Shell";
import { ActionCard, EmptyState, MetricCard, PageHeader } from "@/components/app/bits";
import { orchestrate, type ExpiryBand } from "@/lib/agents";
import { formatDate, inr } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expiry")({
  head: () => ({
    meta: [
      { title: "Expiry Command Center — StockPilot AI" },
      {
        name: "description",
        content: "Track shelf-life exposure by band, see units and rupees at risk, and act before stock is written off.",
      },
      { property: "og:title", content: "Expiry Command Center — StockPilot AI" },
      { property: "og:description", content: "Critical, high and medium expiry bands with recommended actions." },
    ],
  }),
  component: ExpiryPage,
});

const BANDS: { band: ExpiryBand; label: string; tone: string }[] = [
  { band: "Critical", label: "Critical · ≤ 7 days", tone: "text-critical border-critical/40 bg-critical/10" },
  { band: "High", label: "High · 8–30 days", tone: "text-warning border-warning/40 bg-warning/10" },
  { band: "Medium", label: "Medium · 31–60 days", tone: "text-info border-info/40 bg-info/10" },
];

function ExpiryPage() {
  const o = useMemo(() => orchestrate(), []);
  const { items, totalValueAtRisk, totalUnitsAtRisk } = o.expiry;

  return (
    <Shell>
      <PageHeader
        eyebrow="Expiry Risk Agent"
        title="Expiry Command Center"
        description="Stock is only at risk when forecast sell-through cannot clear it before the expiry date. These are the units that will not make it."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Value at risk" value={inr(totalValueAtRisk, true)} sub="Write-off exposure at cost" icon={AlertOctagon} tone="critical" />
        <MetricCard label="Units at risk" value={`${totalUnitsAtRisk}`} sub="Will not sell before expiry" icon={PackageX} tone="warning" delay={60} />
        <MetricCard label="Critical SKUs" value={`${items.filter((i) => i.band === "Critical").length}`} sub="Expiring within 7 days" icon={CalendarClock} tone="critical" delay={120} />
        <MetricCard label="SKUs monitored" value={`${items.length}`} sub="Inside the 60-day window" icon={TrendingDown} delay={180} />
      </section>

      {items.length === 0 ? (
        <EmptyState title="No expiry exposure" description="Forecast sell-through clears all perishable stock before its expiry date." />
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-3">
            {BANDS.map(({ band, label, tone }) => {
              const inBand = items.filter((i) => i.band === band);
              return (
                <div key={band} className="panel animate-rise p-5">
                  <span className={cn("inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold", tone)}>{label}</span>
                  <p className="num mt-4 text-2xl font-semibold text-foreground">
                    {inr(inBand.reduce((s, i) => s + i.valueAtRisk, 0), true)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inBand.length} SKUs · {inBand.reduce((s, i) => s + i.unitsAtRisk, 0)} units at risk
                  </p>
                  <ul className="mt-4 space-y-2">
                    {inBand.slice(0, 5).map((i) => (
                      <li key={i.product.sku} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1.5 text-xs">
                        <Link to="/inventory/$sku" params={{ sku: i.product.sku }} className="truncate text-foreground/90 hover:text-primary">
                          {i.product.name}
                        </Link>
                        <span className="num shrink-0 text-muted-foreground">
                          {i.product.daysToExpiry}d · {inr(i.valueAtRisk, true)}
                        </span>
                      </li>
                    ))}
                    {inBand.length === 0 ? <li className="text-xs text-muted-foreground">Nothing in this band.</li> : null}
                  </ul>
                </div>
              );
            })}
          </section>

          <section className="panel animate-rise overflow-hidden">
            <div className="border-b border-border/70 px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">Expiry watchlist</p>
              <p className="text-xs text-muted-foreground">Sorted by closest expiry date</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {["Product", "Expiry", "Days left", "Stock", "Sell-through", "Units at risk", "Value at risk"].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.product.sku} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-3 pl-5">
                        <Link to="/inventory/$sku" params={{ sku: i.product.sku }} className="font-medium text-foreground hover:text-primary">
                          {i.product.name}
                        </Link>
                        <p className="num text-[11px] text-muted-foreground">{i.product.sku}</p>
                      </td>
                      <td className="num px-3 py-3 text-muted-foreground">{i.product.expiryDate ? formatDate(i.product.expiryDate) : "—"}</td>
                      <td className={cn("num px-3 py-3 font-medium", i.band === "Critical" ? "text-critical" : i.band === "High" ? "text-warning" : "text-info")}>
                        {i.product.daysToExpiry} d
                      </td>
                      <td className="num px-3 py-3">{i.product.stock}</td>
                      <td className="num px-3 py-3 text-muted-foreground">
                        {Math.round(i.product.forecastDaily * (i.product.daysToExpiry ?? 0))} u
                      </td>
                      <td className="num px-3 py-3 text-warning">{i.unitsAtRisk}</td>
                      <td className="num px-3 py-3 pr-5 font-semibold text-critical">{inr(i.valueAtRisk)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            {o.expiry.findings.slice(0, 6).map((f) => (
              <ActionCard key={f.id} finding={f} />
            ))}
          </section>
        </>
      )}
    </Shell>
  );
}
