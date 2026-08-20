import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  HeartPulse,
  IndianRupee,
  Recycle,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Shell } from "@/components/app/Shell";
import { MetricCard, PageHeader, PriorityBadge, StatusBadge, TrendPill } from "@/components/app/bits";
import { AGENTS, orchestrate } from "@/lib/agents";
import { getProducts, inr, round } from "@/lib/intelligence";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StockPilot AI — Predictive Inventory Intelligence" },
      {
        name: "description",
        content:
          "StockPilot AI predicts stockouts, dead stock and expiry losses, explains why, and tells your business exactly what to do next.",
      },
      { property: "og:title", content: "StockPilot AI — Predictive Inventory Intelligence" },
      {
        property: "og:description",
        content: "An AI agent team that turns inventory data into a prioritised daily action plan.",
      },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["var(--primary)", "var(--accent)", "var(--info)", "var(--warning)", "var(--critical)", "var(--success)"];

function Dashboard() {
  const products = useMemo(() => getProducts(), []);
  const o = useMemo(() => orchestrate(), []);
  const a = o.analytics;

  const highRisk = products.filter((p) => p.stockoutRisk >= 65);
  const topActions = o.findings.slice(0, 5);

  return (
    <Shell require="analytics.view">
      <PageHeader
        eyebrow="Executive dashboard"
        title="Inventory command overview"
        description="Traditional inventory software answers “what do I have?”. StockPilot AI answers what is going to happen, why it is happening, and what to do about it today."
        actions={
          <>
            <Link
              to="/decisions"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="size-3.5" /> Today&apos;s top actions
            </Link>
            <Link
              to="/simulator"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Run a what-if
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Inventory value" value={inr(a.totalInventoryValue, true)} sub={`${products.length} SKUs at cost`} icon={IndianRupee} />
        <MetricCard label="Health score" value={`${a.healthScore}/100`} sub="Value-weighted across catalogue" icon={HeartPulse} tone={a.healthScore >= 70 ? "positive" : "warning"} delay={50} />
        <MetricCard label="Stockout risk" value={`${highRisk.length} SKUs`} sub={`${inr(a.stockoutExposure, true)} revenue exposure`} icon={AlertTriangle} tone="critical" delay={100} />
        <MetricCard label="Dead stock value" value={inr(a.deadStockValue, true)} sub={`${o.deadstock.items.length} slow-moving SKUs`} icon={Recycle} tone="warning" delay={150} />
        <MetricCard label="Expiry risk value" value={inr(a.expiryExposure, true)} sub={`${o.expiry.totalUnitsAtRisk} units at risk`} icon={CalendarClock} tone="accent" delay={200} />
        <MetricCard label="Needs action" value={`${a.productsRequiringAction}`} sub="Products flagged by agents" icon={Target} tone="critical" delay={250} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel animate-rise relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
              <Sparkles className="size-4" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">AI inventory brief</p>
          </div>

          <p className="mt-4 text-lg leading-relaxed text-foreground">{o.brief}</p>

          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {a.insights.map((i) => (
              <li key={i} className="rounded-lg border border-border bg-background/40 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                {i}
              </li>
            ))}
          </ul>

          <Link to="/copilot" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-glow">
            Ask the copilot what to do today <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="panel animate-rise p-6">
          <p className="text-sm font-semibold text-foreground">Capital by category</p>
          <p className="text-xs text-muted-foreground">Inventory value at cost</p>
          <div className="mt-2 h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={a.categoryBreakdown} dataKey="value" nameKey="category" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none">
                  {a.categoryBreakdown.map((entry, i) => (
                    <Cell key={entry.category} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => inr(v, true)}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 grid gap-1.5">
            {a.categoryBreakdown.map((c, i) => (
              <li key={c.category} className="flex items-center gap-2 text-[11px]">
                <span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-muted-foreground">{c.category}</span>
                <span className="num ml-auto text-foreground">{inr(c.value, true)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel animate-rise overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Today&apos;s top actions</p>
              <p className="text-xs text-muted-foreground">Ranked by the priority engine</p>
            </div>
            <Link to="/decisions" className="text-xs font-medium text-primary hover:text-primary-glow">
              Open Decision Center
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {topActions.map((f, i) => (
              <li key={f.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="num text-xs text-muted-foreground">{i + 1}</span>
                  <PriorityBadge priority={f.priority} />
                  <Link to="/inventory/$sku" params={{ sku: f.sku }} className="text-sm font-medium text-foreground hover:text-primary">
                    {f.product}
                  </Link>
                  <span className="num ml-auto text-xs font-semibold text-primary">{inr(f.impactValue, true)}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{f.action}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{f.reasoning}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          <div className="panel animate-rise p-5">
            <p className="text-sm font-semibold text-foreground">Agent team status</p>
            <ul className="mt-3 space-y-2.5">
              {AGENTS.map((agent) => (
                <li key={agent.id} className="flex items-start gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground">{agent.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel animate-rise p-5">
            <p className="text-sm font-semibold text-foreground">Fastest movers</p>
            <ul className="mt-3 space-y-2.5">
              {a.topPerformers.map((p) => (
                <li key={p.sku} className="flex items-center justify-between gap-3 border-b border-dashed border-border/60 pb-2 last:border-0">
                  <div className="min-w-0">
                    <Link to="/inventory/$sku" params={{ sku: p.sku }} className="truncate text-xs font-medium text-foreground hover:text-primary">
                      {p.name}
                    </Link>
                    <p className="num text-[11px] text-muted-foreground">
                      {p.avgDaily}/day · {round(p.daysRemaining, 1)}d cover
                    </p>
                  </div>
                  <TrendPill pct={p.trendPct} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel animate-rise overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Highest risk SKUs</p>
            <p className="text-xs text-muted-foreground">Coverage below or near supplier lead time</p>
          </div>
          <Link to="/inventory" className="text-xs font-medium text-primary hover:text-primary-glow">
            Open Inventory Explorer
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {["Product", "Stock", "Daily sales", "Days left", "Lead time", "Value", "AI status"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...highRisk]
                .sort((x, y) => x.daysRemaining - y.daysRemaining)
                .slice(0, 8)
                .map((p) => (
                  <tr key={p.sku} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-3 pl-5">
                      <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-medium text-foreground hover:text-primary">
                        {p.name}
                      </Link>
                      <p className="num text-[11px] text-muted-foreground">{p.sku} · {p.supplier.name}</p>
                    </td>
                    <td className="num px-3 py-3">{p.stock}</td>
                    <td className="num px-3 py-3">{p.avgDaily}</td>
                    <td className="num px-3 py-3 font-semibold text-critical">{round(p.daysRemaining, 1)}</td>
                    <td className="num px-3 py-3">{p.leadTimeDays} d</td>
                    <td className="num px-3 py-3">{inr(p.inventoryValue, true)}</td>
                    <td className="px-3 py-3 pr-5"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
