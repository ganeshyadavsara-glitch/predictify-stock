import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Shell } from "@/components/app/Shell";
import { PageHeader } from "@/components/app/bits";
import { getProducts, inr, round } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "What-If Simulator — StockPilot AI" },
      {
        name: "description",
        content: "Model demand growth, supplier delays and safety-stock policy, and see which SKUs turn critical before they do.",
      },
      { property: "og:title", content: "What-If Simulator — StockPilot AI" },
      { property: "og:description", content: "Stress-test your inventory against demand spikes and supplier delays." },
    ],
  }),
  component: Simulator,
});

function Simulator() {
  const products = useMemo(() => getProducts(), []);
  const [growth, setGrowth] = useState(20);
  const [delay, setDelay] = useState(2);
  const [safety, setSafety] = useState(1);

  const sim = useMemo(() => {
    const rows = products.map((p) => {
      const baseCritical = p.daysRemaining <= p.leadTimeDays;
      const newDaily = p.avgDaily * (1 + growth / 100);
      const newDays = newDaily > 0.05 ? round(p.stock / newDaily, 1) : 999;
      const effectiveLead = p.leadTimeDays + delay;
      const nowCritical = newDaily > 0.05 && newDays <= effectiveLead;
      const requiredSafety = Math.ceil(newDaily * (effectiveLead / 2) * safety);
      const requiredQty = Math.max(0, Math.ceil(newDaily * (effectiveLead + 14) + requiredSafety - p.stock));
      return { product: p, baseCritical, newDays, effectiveLead, nowCritical, requiredQty, requiredCost: requiredQty * p.cost };
    });

    const baseCriticalCount = rows.filter((r) => r.baseCritical).length;
    const newCriticalCount = rows.filter((r) => r.nowCritical).length;
    const newlyCritical = rows.filter((r) => r.nowCritical && !r.baseCritical);
    const extraSpend = rows.reduce((s, r) => s + r.requiredCost, 0);
    const baseSpend = products.reduce((s, p) => s + p.reorderCost, 0);

    return { rows, baseCriticalCount, newCriticalCount, newlyCritical, extraSpend, baseSpend };
  }, [products, growth, delay, safety]);

  const chartData = sim.rows
    .filter((r) => r.newDays < 40)
    .sort((a, b) => a.newDays - b.newDays)
    .slice(0, 12)
    .map((r) => ({
      name: r.product.name.length > 16 ? `${r.product.name.slice(0, 15)}…` : r.product.name,
      days: r.newDays,
      critical: r.nowCritical,
    }));

  return (
    <Shell>
      <PageHeader
        eyebrow="Scenario planning"
        title="What-If Simulator"
        description="Change the assumptions and watch the risk surface move. Every output recalculates from the same deterministic coverage maths used across the product."
        actions={
          <button
            onClick={() => {
              setGrowth(20);
              setDelay(2);
              setSafety(1);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset scenario
          </button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="panel animate-rise space-y-6 p-5">
          <Slider label="Sales growth" value={growth} min={-30} max={80} step={5} suffix="%" onChange={setGrowth} hint="Applied to every SKU's daily velocity" />
          <Slider label="Supplier delay" value={delay} min={0} max={10} step={1} suffix=" days" onChange={setDelay} hint="Added on top of quoted lead times" />
          <Slider label="Safety stock policy" value={safety} min={0.5} max={2.5} step={0.25} suffix="×" onChange={setSafety} hint="Multiplier on the recommended buffer" />

          <div className="rounded-lg border border-primary/25 bg-primary/8 p-3.5">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" /> Simulation verdict
            </p>
            <p className="mt-2 text-xs leading-relaxed text-foreground/90">
              If demand {growth >= 0 ? "increases" : "falls"} by {Math.abs(growth)}%
              {delay > 0 ? ` and suppliers slip by ${delay} day${delay > 1 ? "s" : ""}` : ""},{" "}
              <span className="font-semibold text-critical">{sim.newlyCritical.length} additional SKUs</span> reach critical
              stock levels — taking the total from {sim.baseCriticalCount} to {sim.newCriticalCount}.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <SimStat label="Critical SKUs" base={`${sim.baseCriticalCount}`} now={`${sim.newCriticalCount}`} tone="critical" icon={<AlertTriangle className="size-4" />} />
            <SimStat label="Newly at risk" base="0" now={`${sim.newlyCritical.length}`} tone="warning" icon={<TrendingUp className="size-4" />} />
            <SimStat label="Purchase requirement" base={inr(sim.baseSpend, true)} now={inr(sim.extraSpend, true)} tone="accent" icon={<Sparkles className="size-4" />} />
          </div>

          <div className="panel p-5">
            <p className="text-sm font-semibold text-foreground">Days of cover under this scenario</p>
            <p className="text-xs text-muted-foreground">Red bars fall inside the delayed lead-time window</p>
            <div className="mt-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-35} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="days" name="Days of cover" radius={[6, 6, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={d.critical ? "var(--critical)" : "var(--primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-border/70 px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">SKUs pushed into critical territory</p>
              <p className="text-xs text-muted-foreground">Healthy today, at risk under this scenario</p>
            </div>
            {sim.newlyCritical.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                No additional SKUs turn critical under these assumptions.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {["Product", "Cover today", "Cover in scenario", "Effective lead time", "Extra order", "Cost"].map((h) => (
                        <th key={h} className="px-3 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sim.newlyCritical.map((r) => (
                      <tr key={r.product.sku} className="border-b border-border/40 last:border-0">
                        <td className="px-3 py-3 pl-5 font-medium text-foreground">{r.product.name}</td>
                        <td className="num px-3 py-3 text-muted-foreground">{round(r.product.daysRemaining, 1)} d</td>
                        <td className="num px-3 py-3 font-semibold text-critical">{r.newDays} d</td>
                        <td className="num px-3 py-3">{r.effectiveLead} d</td>
                        <td className="num px-3 py-3">{r.requiredQty} u</td>
                        <td className="num px-3 py-3 pr-5">{inr(r.requiredCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  hint: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={label} className="text-xs font-medium text-foreground">
          {label}
        </label>
        <span className="num text-sm font-semibold text-primary">
          {value > 0 && suffix === "%" ? "+" : ""}
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
      />
      <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SimStat({
  label,
  base,
  now,
  tone,
  icon,
}: {
  label: string;
  base: string;
  now: string;
  tone: "critical" | "warning" | "accent";
  icon: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            tone === "critical" && "bg-critical/12 text-critical",
            tone === "warning" && "bg-warning/12 text-warning",
            tone === "accent" && "bg-accent/12 text-accent",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="num mt-3 text-2xl font-semibold text-foreground">{now}</p>
      <p className="num mt-1 text-[11px] text-muted-foreground">baseline {base}</p>
    </div>
  );
}
