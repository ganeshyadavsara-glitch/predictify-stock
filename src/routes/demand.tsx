import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Shell } from "@/components/app/Shell";
import { MetricCard, PageHeader, TrendPill } from "@/components/app/bits";
import { orchestrate } from "@/lib/agents";
import { formatDate, formatShortDate, getProducts, projectProduct, round } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demand")({
  head: () => ({
    meta: [
      { title: "Demand Intelligence — StockPilot AI" },
      {
        name: "description",
        content: "Historical versus projected demand, stock projection and predicted stockout dates with confidence indicators.",
      },
      { property: "og:title", content: "Demand Intelligence — StockPilot AI" },
      { property: "og:description", content: "See where demand is heading before it hits your shelves." },
    ],
  }),
  component: DemandPage,
});

function DemandPage() {
  const products = useMemo(() => getProducts(), []);
  const o = useMemo(() => orchestrate(), []);
  const [horizon, setHorizon] = useState<7 | 30>(30);
  const [sku, setSku] = useState(o.forecast.stockoutsIn30Days[0]?.sku ?? products[0]!.sku);

  const product = products.find((p) => p.sku === sku)!;

  const data = useMemo(() => {
    const hist = product.history
      .filter((h) => h.daysAgo <= horizon)
      .map((h) => ({ label: formatShortDate(h.date), historical: h.units, projected: null as number | null, stock: null as number | null }));
    const fut = projectProduct(product, horizon).map((f) => ({
      label: formatShortDate(f.date),
      historical: null as number | null,
      projected: f.units,
      stock: f.projectedStock,
    }));
    return [...hist, ...fut];
  }, [product, horizon]);

  return (
    <Shell>
      <PageHeader
        eyebrow="Demand Forecast Agent"
        title="Demand Intelligence"
        description="Deterministic forecasting from trailing velocity, trend delta and weekday seasonality — with the historical and projected series always visually separated."
        actions={
          <div className="flex rounded-lg border border-border p-0.5">
            {([7, 30] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  horizon === h ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {h}-day view
              </button>
            ))}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Accelerating SKUs" value={`${o.forecast.accelerating.length}`} sub="Demand up 15%+ vs prior fortnight" icon={TrendingUp} tone="positive" />
        <MetricCard label="Declining SKUs" value={`${o.forecast.declining.length}`} sub="Demand down 15%+" icon={TrendingDown} tone="warning" delay={60} />
        <MetricCard label="Stockout in 7 days" value={`${o.forecast.stockoutsIn7Days.length}`} sub="At forecast demand" icon={Zap} tone="critical" delay={120} />
        <MetricCard label="Stockout in 30 days" value={`${o.forecast.stockoutsIn30Days.length}`} sub="At forecast demand" icon={Activity} tone="accent" delay={180} />
      </section>

      <section className="panel animate-rise p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Demand &amp; stock projection</h2>
            <p className="text-xs text-muted-foreground">
              {product.name} · confidence {product.confidence}% ·{" "}
              {product.stockoutDate ? `projected stockout ${formatDate(product.stockoutDate)}` : "no stockout within 120 days"}
            </p>
          </div>
          <select
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            aria-label="Select product"
            className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary/60"
          >
            {products.map((p) => (
              <option key={p.sku} value={p.sku} className="bg-surface">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gStock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--info)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={Math.max(2, Math.round(horizon / 5))} tickLine={false} axisLine={false} />
              <YAxis yAxisId="units" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="stock" orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Area yAxisId="units" type="monotone" dataKey="historical" name="Historical demand" stroke="var(--primary)" fill="url(#gHist)" strokeWidth={2} dot={false} connectNulls={false} />
              <Line yAxisId="units" type="monotone" dataKey="projected" name="Projected demand" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Area yAxisId="stock" type="monotone" dataKey="stock" name="Projected stock on hand" stroke="var(--info)" fill="url(#gStock)" strokeWidth={1.5} dot={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-primary" /> Historical (actual)</span>
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-accent opacity-80" /> Projected (forecast)</span>
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full bg-info" /> Projected stock on hand</span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <TrendList title="Selling faster than usual" hint="Trailing 14d vs previous 14d" items={o.forecast.accelerating.slice(0, 7)} />
        <TrendList title="Losing momentum" hint="Candidates for promotion or reduced purchasing" items={o.forecast.declining.slice(0, 7)} />
      </section>

      <section className="panel animate-rise overflow-hidden">
        <div className="border-b border-border/70 px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">Predicted stockout timeline</p>
          <p className="text-xs text-muted-foreground">Closest projected stockout dates at forecast demand</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {["Product", "Stock", "Forecast/day", "Days left", "Stockout date", "Lead time", "Confidence"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...o.forecast.stockoutsIn30Days]
                .sort((a, b) => a.daysRemaining - b.daysRemaining)
                .map((p) => (
                  <tr key={p.sku} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-3 pl-5">
                      <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-medium text-foreground hover:text-primary">
                        {p.name}
                      </Link>
                    </td>
                    <td className="num px-3 py-3">{p.stock}</td>
                    <td className="num px-3 py-3">{p.forecastDaily}</td>
                    <td className={cn("num px-3 py-3 font-medium", p.daysRemaining <= p.leadTimeDays ? "text-critical" : "text-warning")}>
                      {round(p.daysRemaining, 1)}
                    </td>
                    <td className="num px-3 py-3 text-muted-foreground">{p.stockoutDate ? formatDate(p.stockoutDate) : "—"}</td>
                    <td className="num px-3 py-3">{p.leadTimeDays} d</td>
                    <td className="num px-3 py-3 pr-5 text-muted-foreground">{p.confidence}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}

function TrendList({ title, hint, items }: { title: string; hint: string; items: ReturnType<typeof getProducts> }) {
  return (
    <div className="panel animate-rise p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((p) => (
          <li key={p.sku} className="flex items-center justify-between gap-3 border-b border-dashed border-border/60 pb-2">
            <div className="min-w-0">
              <Link to="/inventory/$sku" params={{ sku: p.sku }} className="truncate text-sm text-foreground hover:text-primary">
                {p.name}
              </Link>
              <p className="num text-[11px] text-muted-foreground">
                {p.prevAvgDaily} → {p.avgDaily} units/day
              </p>
            </div>
            <TrendPill pct={p.trendPct} />
          </li>
        ))}
        {items.length === 0 ? <li className="text-xs text-muted-foreground">No SKUs in this band.</li> : null}
      </ul>
    </div>
  );
}
