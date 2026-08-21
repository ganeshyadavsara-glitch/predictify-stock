import { Link, createFileRoute } from "@tanstack/react-router";
import { Boxes, MapPin, Recycle, Truck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Shell } from "@/components/app/Shell";
import { MetricCard, PageHeader, RiskMeter, SectionTitle, StatusBadge } from "@/components/app/bits";
import {
  LENS_LABEL,
  LOCATIONS,
  SUPPLIER_ORIGINS,
  buildLocationRollups,
  lensValue,
  project,
  riskTone,
  type RiskLens,
} from "@/lib/geo";
import { CATEGORIES } from "@/data/catalog";
import { getProducts, inr } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/maps")({
  head: () => ({
    meta: [
      { title: "Network Map — StockPilot AI" },
      {
        name: "description",
        content:
          "Interactive supplier and location map showing inventory value, stockout, dead stock and expiry risk across the StockPilot network.",
      },
      { property: "og:title", content: "Network Map — StockPilot AI" },
      {
        property: "og:description",
        content: "See inventory and supplier risk by location on an interactive network map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapsPage,
});

const W = 720;
const H = 620;

function MapsPage() {
  const products = useMemo(() => getProducts(), []);
  const [lens, setLens] = useState<RiskLens>("composite");
  const [category, setCategory] = useState<string>("All");
  const [showRoutes, setShowRoutes] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(LOCATIONS[0]!.id);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (category === "All" ? products : products.filter((p) => p.category === category)),
    [products, category],
  );
  const rollups = useMemo(() => buildLocationRollups(filtered), [filtered]);
  const byId = useMemo(() => new Map(rollups.map((r) => [r.node.id, r])), [rollups]);
  const selected = byId.get(selectedId) ?? rollups[0]!;
  const active = byId.get(hoverId ?? selectedId) ?? selected;

  const maxValue = Math.max(1, ...rollups.map((r) => r.inventoryValue));
  const totalValue = rollups.reduce((s, r) => s + r.inventoryValue, 0);
  const totalCritical = rollups.reduce((s, r) => s + r.criticalCount, 0);
  const worst = [...rollups].sort((a, b) => lensValue(b, lens) - lensValue(a, lens))[0]!;

  return (
    <Shell require="analytics.view">
      <PageHeader
        eyebrow="Geo intelligence"
        title="Network map"
        description="Every location and supplier lane in the network, sized by capital at risk and coloured by the risk lens you choose. Hover a node for a live tooltip, click to drill into its SKUs."
        actions={
          <Link
            to="/graphs"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised/60 px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            Open graphs
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Network capital" value={inr(totalValue, true)} sub={`${LOCATIONS.length} locations`} icon={Boxes} delay={0} />
        <MetricCard
          label="Highest risk site"
          value={worst.node.city}
          sub={`${LENS_LABEL[lens]} ${lensValue(worst, lens)}%`}
          icon={TriangleAlert}
          tone="critical"
          progress={lensValue(worst, lens)}
          delay={60}
        />
        <MetricCard label="Critical SKUs" value={String(totalCritical)} sub="Across all sites" icon={Recycle} tone="warning" delay={120} />
        <MetricCard
          label="Supplier lanes"
          value={String(Object.values(SUPPLIER_ORIGINS).reduce((s, o) => s + o.servesLocationIds.length, 0))}
          sub={`${Object.keys(SUPPLIER_ORIGINS).length} supplier origins`}
          icon={Truck}
          tone="accent"
          delay={180}
        />
      </section>

      {/* Filters */}
      <section className="panel animate-rise flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(LENS_LABEL) as RiskLens[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLens(l)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                lens === l ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {LENS_LABEL[l]}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="size-3.5 accent-[var(--primary)]"
          />
          Show supplier lanes
        </label>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        {/* Map */}
        <div className="panel animate-rise relative overflow-hidden p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Interactive network map of locations and suppliers">
            {/* graticule */}
            {Array.from({ length: 7 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={(W / 6) * i}
                y1={0}
                x2={(W / 6) * i}
                y2={H}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="3 7"
              />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={(H / 6) * i}
                x2={W}
                y2={(H / 6) * i}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="3 7"
              />
            ))}

            {/* supplier lanes */}
            {showRoutes
              ? Object.entries(SUPPLIER_ORIGINS).flatMap(([sid, origin]) =>
                  origin.servesLocationIds.map((locId) => {
                    const loc = LOCATIONS.find((l) => l.id === locId)!;
                    const a = project(origin.lat, origin.lng, W, H);
                    const b = project(loc.lat, loc.lng, W, H);
                    const dim = active.node.id !== locId;
                    return (
                      <line
                        key={`${sid}-${locId}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="var(--primary)"
                        strokeWidth={dim ? 1 : 2}
                        strokeOpacity={dim ? 0.16 : 0.7}
                      />
                    );
                  }),
                )
              : null}

            {/* supplier origins */}
            {Object.entries(SUPPLIER_ORIGINS).map(([sid, origin]) => {
              const p = project(origin.lat, origin.lng, W, H);
              return (
                <g key={sid}>
                  <rect
                    x={p.x - 5}
                    y={p.y - 5}
                    width={10}
                    height={10}
                    rx={2}
                    fill="var(--surface-raised, var(--card))"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                  />
                  <text x={p.x + 9} y={p.y + 3} fontSize={9} fill="var(--muted-foreground)">
                    {origin.city}
                  </text>
                </g>
              );
            })}

            {/* locations */}
            {rollups.map((r) => {
              const p = project(r.node.lat, r.node.lng, W, H);
              const value = lensValue(r, lens);
              const tone = riskTone(value);
              const radius = 10 + (r.inventoryValue / maxValue) * 20;
              const isActive = active.node.id === r.node.id;
              return (
                <g
                  key={r.node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverId(r.node.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => setSelectedId(r.node.id)}
                >
                  <circle cx={p.x} cy={p.y} r={radius + 8} fill={tone.fill} opacity={isActive ? 0.18 : 0.08} />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius}
                    fill={tone.fill}
                    fillOpacity={0.72}
                    stroke={isActive ? "var(--foreground)" : tone.fill}
                    strokeWidth={isActive ? 2 : 1}
                  />
                  <text x={p.x} y={p.y + 3.5} fontSize={10} fontWeight={700} textAnchor="middle" fill="#fff">
                    {value}
                  </text>
                  <text x={p.x} y={p.y + radius + 14} fontSize={10} textAnchor="middle" fill="var(--foreground)">
                    {r.node.city}
                  </text>
                  <title>{`${r.node.name} · ${LENS_LABEL[lens]} ${value}% · ${inr(r.inventoryValue, true)} · ${r.skus} SKUs`}</title>
                </g>
              );
            })}
          </svg>

          {/* legend + hover readout */}
          <div className="mt-2 flex flex-wrap items-center gap-4 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
            {[
              { label: "Low", v: 10 },
              { label: "Moderate", v: 30 },
              { label: "Elevated", v: 50 },
              { label: "High", v: 80 },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: riskTone(l.v).fill }} />
                {l.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] border border-accent" /> Supplier origin
            </span>
            <span className="ml-auto">Bubble size = inventory value · number = {LENS_LABEL[lens].toLowerCase()}</span>
          </div>

          {hoverId ? (
            <div className="pointer-events-none absolute right-5 top-5 w-56 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-foreground">{active.node.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {active.node.kind} · {active.node.state}
              </p>
              <dl className="mt-2 space-y-1 text-[11px]">
                <Row label="Inventory value" value={inr(active.inventoryValue, true)} />
                <Row label={LENS_LABEL[lens]} value={`${lensValue(active, lens)}%`} />
                <Row label="Health score" value={`${active.healthScore}/100`} />
                <Row label="Critical SKUs" value={String(active.criticalCount)} />
              </dl>
            </div>
          ) : null}
        </div>

        {/* Selected location detail */}
        <div className="space-y-4">
          <div className="panel animate-rise p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{selected.node.kind}</p>
                <h2 className="mt-1 text-xl font-semibold text-foreground">{selected.node.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selected.node.city}, {selected.node.state} · {selected.skus} SKUs · {selected.units} units
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                <MapPin className="size-4" />
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Fact label="Inventory value" value={inr(selected.inventoryValue, true)} />
              <Fact label="Retail value" value={inr(selected.retailValue, true)} />
              <Fact label="Dead stock" value={inr(selected.deadStockValue, true)} />
              <Fact label="Expiry ≤30d" value={inr(selected.expiryValue, true)} />
            </div>

            <div className="mt-4 space-y-3">
              <RiskMeter value={selected.riskScore} level={selected.riskScore >= 65 ? "critical" : selected.riskScore >= 45 ? "high" : selected.riskScore >= 25 ? "medium" : "low"} label="Composite risk" />
              <RiskMeter value={selected.avgStockoutRisk} level={selected.avgStockoutRisk >= 65 ? "critical" : selected.avgStockoutRisk >= 45 ? "high" : "medium"} label="Avg stockout risk" />
            </div>
          </div>

          <div className="panel animate-rise p-5">
            <SectionTitle title="Suppliers serving this site" hint={`${selected.suppliers.length} lanes`} />
            <ul className="mt-3 space-y-2">
              {selected.suppliers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="num text-[11px] text-muted-foreground">
                      {SUPPLIER_ORIGINS[s.id]?.city} · {s.leadTimeDays}d lead time
                    </p>
                  </div>
                  <span
                    className={cn(
                      "num rounded-md px-2 py-1 text-[11px] font-semibold",
                      s.reliability >= 90 ? "bg-success/15 text-success" : s.reliability >= 84 ? "bg-warning/15 text-warning" : "bg-critical/15 text-critical",
                    )}
                  >
                    {s.reliability}%
                  </span>
                </li>
              ))}
              {selected.suppliers.length === 0 ? (
                <li className="text-xs text-muted-foreground">No supplier lanes for this filter.</li>
              ) : null}
            </ul>
          </div>

          <div className="panel animate-rise p-5">
            <SectionTitle title="Riskiest SKUs at this site" hint="Click to open intelligence" />
            <ul className="mt-3 space-y-2">
              {[...selected.products]
                .sort((a, b) => b.stockoutRisk + b.deadStockRisk - (a.stockoutRisk + a.deadStockRisk))
                .slice(0, 6)
                .map((p) => (
                  <li key={p.sku}>
                    <Link
                      to="/inventory/$sku"
                      params={{ sku: p.sku }}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="num text-[11px] text-muted-foreground">
                          {p.sku} · {inr(p.inventoryValue, true)}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              {selected.products.length === 0 ? (
                <li className="text-xs text-muted-foreground">No SKUs match this category filter here.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-raised/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
