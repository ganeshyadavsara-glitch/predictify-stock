import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Boxes, CalendarClock, Gauge, Truck } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Shell } from "@/components/app/Shell";
import { ActionCard, EmptyState, FieldLabel, PageHeader, RiskMeter, StatusBadge, TrendPill } from "@/components/app/bits";
import { findingsForProduct } from "@/lib/agents";
import {
  formatDate,
  formatShortDate,
  getProduct,
  inr,
  projectProduct,
  round,
} from "@/lib/intelligence";

export const Route = createFileRoute("/inventory/$sku")({
  loader: ({ params }) => {
    const product = getProduct(params.sku);
    if (!product) throw notFound();
    return { name: product.name, sku: product.sku };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product unavailable — StockPilot AI" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${loaderData.name} — Product Intelligence | StockPilot AI` },
        {
          name: "description",
          content: `Risk explanation, demand forecast and recommended action for ${loaderData.name} (${loaderData.sku}).`,
        },
        { property: "og:title", content: `${loaderData.name} — Product Intelligence` },
        {
          property: "og:description",
          content: `Why ${loaderData.name} is at risk and what the AI recommends doing about it.`,
        },
      ],
    };
  },
  component: ProductIntelligence,
});

function ProductIntelligence() {
  const { sku } = Route.useParams();
  const product = getProduct(sku)!;
  const findings = useMemo(() => findingsForProduct(sku), [sku]);

  const chartData = useMemo(() => {
    const history = product.history.map((h) => ({
      label: formatShortDate(h.date),
      actual: h.units,
      forecast: null as number | null,
      stock: null as number | null,
    }));
    const forecast = projectProduct(product, 30).map((f) => ({
      label: formatShortDate(f.date),
      actual: null as number | null,
      forecast: f.units,
      stock: f.projectedStock,
    }));
    return [...history, ...forecast];
  }, [product]);

  const covered = product.daysRemaining >= product.leadTimeDays;

  return (
    <Shell>
      <Link to="/inventory" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-3.5" /> Back to Inventory Explorer
      </Link>

      <PageHeader
        eyebrow={`${product.sku} · ${product.category}`}
        title={product.name}
        description={`Supplied by ${product.supplier.name} on a ${product.leadTimeDays}-day lead time with ${product.supplier.reliability}% on-time reliability.`}
        actions={<StatusBadge status={product.status} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Current stock" value={`${product.stock} units`} sub={`${inr(product.inventoryValue)} at cost`} icon={<Boxes className="size-4" />} />
        <Stat label="Sales velocity" value={`${product.avgDaily}/day`} sub={`Forecast ${product.forecastDaily}/day next week`} icon={<Gauge className="size-4" />} />
        <Stat
          label="Stock coverage"
          value={product.daysRemaining >= 999 ? "—" : `${round(product.daysRemaining, 1)} days`}
          sub={product.stockoutDate ? `Projected stockout ${formatDate(product.stockoutDate)}` : "No stockout within 120 days"}
          icon={<CalendarClock className="size-4" />}
          tone={covered ? undefined : "critical"}
        />
        <Stat
          label="Expiry"
          value={product.expiryDate ? formatShortDate(product.expiryDate) : "No expiry"}
          sub={product.daysToExpiry !== null ? `${product.daysToExpiry} days away` : "Non-perishable"}
          icon={<Truck className="size-4" />}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="panel animate-rise p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">Demand history &amp; forecast</h2>
              <p className="text-xs text-muted-foreground">
                30 days actual · 30 days projected · {product.confidence}% forecast confidence
              </p>
            </div>
            <TrendPill pct={product.trendPct} />
          </div>

          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={6} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="actual" name="Actual units" stroke="var(--primary)" fill="url(#gActual)" strokeWidth={2} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast units" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                <ReferenceLine x={formatShortDate(new Date())} stroke="var(--muted-foreground)" strokeDasharray="2 4" label={{ value: "today", fill: "var(--muted-foreground)", fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <Legend color="var(--primary)" label="Historical demand (actual)" />
            <Legend color="var(--accent)" label="Projected demand (forecast)" dashed />
          </div>
        </div>

        <div className="space-y-5">
          <div className="panel animate-rise space-y-4 p-5">
            <h2 className="text-base font-semibold text-foreground">Why is this product at risk?</h2>
            <RiskMeter value={product.stockoutRisk} level={product.stockoutRisk >= 85 ? "critical" : product.stockoutRisk >= 65 ? "high" : product.stockoutRisk >= 40 ? "medium" : "low"} label="Stockout risk" />
            <RiskMeter value={product.deadStockRisk} level={product.deadStockRisk >= 75 ? "critical" : product.deadStockRisk >= 50 ? "high" : "low"} label="Dead-stock risk" />
            <RiskMeter value={product.expiryRisk} level={product.expiryRisk >= 70 ? "critical" : product.expiryRisk >= 45 ? "high" : "low"} label="Expiry risk" />
            <p className="rounded-lg border border-border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
              {product.stock} units on hand against {product.avgDaily} units/day of demand gives{" "}
              {round(product.daysRemaining, 1)} days of cover, while {product.supplier.name} needs {product.leadTimeDays} days to
              deliver. Demand is {product.trendLabel.toLowerCase()} ({product.trendPct > 0 ? "+" : ""}
              {product.trendPct}% vs the previous 14 days)
              {product.daysToExpiry !== null ? `, and stock expires in ${product.daysToExpiry} days` : ""}.
            </p>
          </div>

          <div className="panel animate-rise space-y-3 p-5">
            <h2 className="text-base font-semibold text-foreground">Unit economics</h2>
            <dl className="grid gap-2 text-xs">
              <Row label="Unit cost" value={inr(product.cost)} />
              <Row label="Selling price" value={inr(product.price)} />
              <Row label="Margin" value={`${product.marginPct}%`} />
              <Row label="Inventory value" value={inr(product.inventoryValue)} />
              <Row label="Retail value" value={inr(product.retailValue)} />
              <Row label="Reorder point (catalogue)" value={`${product.reorderPoint} units`} />
              <Row label="Reorder point (AI)" value={`${product.computedReorderPoint} units`} />
              <Row label="Safety stock" value={`${product.safetyStock} units`} />
              <Row label="Last movement" value={`${product.lastMovementDaysAgo} days ago`} />
            </dl>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <FieldLabel>What should I do?</FieldLabel>
        {findings.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {findings.map((f) => (
              <ActionCard key={f.id} finding={f} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No action required today"
            description={`${product.name} is inside healthy coverage, movement and expiry thresholds. The agents will re-flag it automatically if any metric drifts.`}
          />
        )}
      </section>
    </Shell>
  );
}

function Stat({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "critical";
}) {
  return (
    <div className="panel animate-rise p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className={`num mt-3 text-xl font-semibold ${tone === "critical" ? "text-critical" : "text-foreground"}`}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-0.5 w-6 rounded-full" style={{ background: color, opacity: dashed ? 0.7 : 1 }} />
      {label}
    </span>
  );
}
