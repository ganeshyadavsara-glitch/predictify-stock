import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  HeartPulse,
  IndianRupee,
  Recycle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

import { Shell } from "@/components/app/Shell";
import { MetricCard, PageHeader, PriorityBadge, StatusBadge, TrendPill } from "@/components/app/bits";
import { AGENTS, orchestrate, type Priority } from "@/lib/agents";
import { getProducts, inr, round } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

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

const PRIORITY_TABS: (Priority | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM"];

function Dashboard() {
  const navigate = useNavigate();
  const products = useMemo(() => getProducts(), []);
  const o = useMemo(() => orchestrate(), []);
  const a = o.analytics;

  const [refreshing, setRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  useEffect(() => {
    setSyncedAt(new Date());
  }, []);
  const [tab, setTab] = useState<Priority | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [ask, setAsk] = useState("");

  const highRisk = products.filter((p) => p.stockoutRisk >= 65);
  const tabFindings = o.findings.filter((f) => tab === "ALL" || f.priority === tab);
  const topActions = tabFindings.slice(0, 5);

  const q = query.trim().toLowerCase();
  const matches = q
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        )
        .slice(0, 6)
    : [];

  function runAgents() {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setSyncedAt(new Date());
      toast.success("Agent sweep complete", {
        description: `${o.findings.length} findings re-ranked · ${inr(a.stockoutExposure, true)} exposure tracked`,
      });
    }, 900);
  }

  return (
    <Shell require="analytics.view">
      <PageHeader
        eyebrow="Executive dashboard"
        title="Inventory command overview"
        description="Traditional inventory software answers “what do I have?”. StockPilot AI answers what is going to happen, why it is happening, and what to do about it today."
        actions={
          <>
            <button
              type="button"
              onClick={runAgents}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              {refreshing ? "Running agents…" : "Re-run agents"}
            </button>
            <Link
              to="/decisions"
              search={{ priority: "CRITICAL" }}
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

      <div className="panel animate-rise flex flex-wrap items-center gap-3 p-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q) navigate({ to: "/inventory", search: { q: query.trim() } });
            }}
            aria-label="Search products"
            placeholder="Search any product, SKU or category…"
            className="w-full rounded-lg border border-border bg-background/50 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          {matches.length ? (
            <div className="animate-rise absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              {matches.map((p) => (
                <Link
                  key={p.sku}
                  to="/inventory/$sku"
                  params={{ sku: p.sku }}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
                  <span className="num text-[11px] text-muted-foreground">{p.sku}</span>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          ) : null}
        </label>

        <form
          className="flex min-w-[260px] flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const question = ask.trim();
            if (!question) return;
            navigate({ to: "/copilot", search: { q: question } });
          }}
        >
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            aria-label="Ask the AI copilot"
            placeholder="Ask the copilot: What should I do today?"
            className="flex-1 rounded-lg border border-border bg-background/50 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!ask.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <Send className="size-3.5" /> Ask
          </button>
        </form>

        <span className="num text-[11px] text-muted-foreground">
          Synced {syncedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <section
        className={cn(
          "grid gap-4 transition-opacity duration-300 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
          refreshing && "pointer-events-none animate-pulse opacity-60",
        )}
      >
        <MetricCard label="Inventory value" value={inr(a.totalInventoryValue, true)} sub={`${products.length} SKUs at cost`} icon={IndianRupee} to="/inventory" />
        <MetricCard label="Health score" value={`${a.healthScore}/100`} sub="Value-weighted across catalogue" icon={HeartPulse} tone={a.healthScore >= 70 ? "positive" : "warning"} delay={50} progress={a.healthScore} to="/inventory" search={{ sort: "risk" }} />
        <MetricCard label="Stockout risk" value={`${highRisk.length} SKUs`} sub={`${inr(a.stockoutExposure, true)} revenue exposure`} icon={AlertTriangle} tone="critical" delay={100} progress={Math.min(100, (highRisk.length / Math.max(1, products.length)) * 300)} to="/reorder" />
        <MetricCard label="Dead stock value" value={inr(a.deadStockValue, true)} sub={`${o.deadstock.items.length} slow-moving SKUs`} icon={Recycle} tone="warning" delay={150} progress={Math.min(100, (a.deadStockValue / Math.max(1, a.totalInventoryValue)) * 300)} to="/dead-stock" />
        <MetricCard label="Expiry risk value" value={inr(a.expiryExposure, true)} sub={`${o.expiry.totalUnitsAtRisk} units at risk`} icon={CalendarClock} tone="accent" delay={200} progress={Math.min(100, (a.expiryExposure / Math.max(1, a.totalInventoryValue)) * 300)} to="/expiry" />
        <MetricCard label="Needs action" value={`${a.productsRequiringAction}`} sub="Products flagged by agents" icon={Target} tone="critical" delay={250} to="/decisions" search={{ priority: "ALL" }} />
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

          <Link
            to="/copilot"
            search={{ q: "What should I do today?" }}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-glow"
          >
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
              <li key={c.category}>
                <Link
                  to="/inventory"
                  search={{ category: c.category }}
                  className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-muted"
                >
                  <span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{c.category}</span>
                  <span className="num ml-auto text-foreground">{inr(c.value, true)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel animate-rise overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-foreground">Today&apos;s top actions</p>
              <p className="text-xs text-muted-foreground">Ranked by the priority engine</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PRIORITY_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    tab === t
                      ? "border-primary/50 bg-primary/12 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "ALL" ? "All" : t}
                  <span className="num ml-1.5 opacity-70">
                    {t === "ALL" ? o.findings.length : o.findings.filter((f) => f.priority === t).length}
                  </span>
                </button>
              ))}
            </div>
            <Link to="/decisions" search={{ priority: tab }} className="text-xs font-medium text-primary hover:text-primary-glow">
              Open Decision Center
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {topActions.length === 0 ? (
              <li className="px-5 py-10 text-center text-xs text-muted-foreground">
                No {tab.toLowerCase()} actions right now — the agents are happy with this slice.
              </li>
            ) : null}
            {topActions.map((f, i) => (
              <li key={f.id} className="animate-rise px-5 py-3.5 transition-colors hover:bg-muted/40" style={{ animationDelay: `${i * 45}ms` }}>
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
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    to="/inventory/$sku"
                    params={{ sku: f.sku }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-glow"
                  >
                    Product intelligence <ArrowUpRight className="size-3" />
                  </Link>
                  <Link
                    to="/copilot"
                    search={{ q: `Tell me about ${f.product}` }}
                    className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Ask copilot
                  </Link>
                  <button
                    type="button"
                    onClick={() => toast.success("Action acknowledged", { description: `${f.product} — ${f.action}` })}
                    className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-success"
                  >
                    Mark as handled
                  </button>
                </div>
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
                  <span className={cn("mt-1 size-1.5 shrink-0 rounded-full bg-primary", refreshing && "pulse-dot")} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground">{refreshing ? "Analysing…" : agent.role}</p>
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
          <Link to="/inventory" search={{ sort: "daysRemaining" }} className="text-xs font-medium text-primary hover:text-primary-glow">
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
