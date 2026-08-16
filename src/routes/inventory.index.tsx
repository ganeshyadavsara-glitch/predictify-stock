import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Shell } from "@/components/app/Shell";
import { EmptyState, PageHeader, StatusBadge, TrendPill } from "@/components/app/bits";
import { CATEGORIES } from "@/data/catalog";
import { formatShortDate, getProducts, inr, round, type Product, type StockStatus } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory Explorer — StockPilot AI" },
      {
        name: "description",
        content:
          "Search, filter and sort every SKU with coverage, velocity, margin, expiry and an AI-assigned risk status.",
      },
      { property: "og:title", content: "Inventory Explorer — StockPilot AI" },
      { property: "og:description", content: "Every SKU with an AI status, coverage and capital view." },
    ],
  }),
  component: InventoryExplorer,
});

const STATUSES: StockStatus[] = [
  "Critical",
  "Low Stock",
  "Expiring Soon",
  "Dead Stock",
  "Overstock",
  "Watch",
  "Healthy",
];

type SortKey = "risk" | "daysRemaining" | "value" | "name" | "velocity";

function InventoryExplorer() {
  const products = useMemo(() => getProducts(), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("risk");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.supplier.name.toLowerCase().includes(q);
      const matchesCategory = category === "All" || p.category === category;
      const matchesStatus = status === "All" || p.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
    const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
      risk: (a, b) => a.healthScore - b.healthScore,
      daysRemaining: (a, b) => a.daysRemaining - b.daysRemaining,
      value: (a, b) => b.inventoryValue - a.inventoryValue,
      name: (a, b) => a.name.localeCompare(b.name),
      velocity: (a, b) => b.avgDaily - a.avgDaily,
    };
    return [...filtered].sort(sorters[sort]);
  }, [products, query, category, status, sort]);

  return (
    <Shell>
      <PageHeader
        eyebrow="Catalogue"
        title="Inventory Explorer"
        description="Every SKU scored by the agent team. Coverage, velocity, capital and expiry in one table — click any row for the full intelligence view."
      />

      <div className="panel animate-rise flex flex-wrap items-center gap-3 p-4">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, SKU or supplier"
            aria-label="Search inventory"
            className="w-full rounded-lg border border-border bg-background/50 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <SelectField label="Category" icon={<Filter className="size-3.5" />} value={category} onChange={setCategory} options={["All", ...CATEGORIES]} />
        <SelectField label="Risk status" icon={<Filter className="size-3.5" />} value={status} onChange={setStatus} options={["All", ...STATUSES]} />
        <SelectField
          label="Sort"
          icon={<ArrowUpDown className="size-3.5" />}
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={["risk", "daysRemaining", "value", "name", "velocity"]}
          labels={{
            risk: "Lowest health first",
            daysRemaining: "Least days of cover",
            value: "Highest inventory value",
            name: "Product name",
            velocity: "Fastest moving",
          }}
        />
        <span className="num ml-auto text-xs text-muted-foreground">{rows.length} SKUs</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No SKUs match those filters" description="Try clearing the search box or switching the risk status back to All." />
      ) : (
        <div className="panel animate-rise overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {["SKU", "Product", "Category", "Stock", "Daily", "Days left", "Reorder pt", "Supplier", "Cost", "Price", "Margin", "Value", "Expiry", "AI status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-3 font-medium first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.sku} className="group border-b border-border/50 transition-colors last:border-0 hover:bg-muted/40">
                    <td className="num whitespace-nowrap px-3 py-3 pl-5 text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-3 py-3">
                      <Link to="/inventory/$sku" params={{ sku: p.sku }} className="font-medium text-foreground transition-colors group-hover:text-primary">
                        {p.name}
                      </Link>
                      <div className="mt-0.5">
                        <TrendPill pct={p.trendPct} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{p.category}</td>
                    <td className="num px-3 py-3">{p.stock}</td>
                    <td className="num px-3 py-3">{p.avgDaily}</td>
                    <td className={cn("num px-3 py-3 font-medium", p.daysRemaining <= p.leadTimeDays ? "text-critical" : p.daysRemaining <= p.leadTimeDays * 2 ? "text-warning" : "text-foreground")}>
                      {p.daysRemaining >= 999 ? "—" : round(p.daysRemaining, 1)}
                    </td>
                    <td className="num px-3 py-3 text-muted-foreground">{p.reorderPoint}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{p.supplier.name}</td>
                    <td className="num px-3 py-3">{inr(p.cost)}</td>
                    <td className="num px-3 py-3">{inr(p.price)}</td>
                    <td className="num px-3 py-3 text-success">{p.marginPct}%</td>
                    <td className="num px-3 py-3">{inr(p.inventoryValue, true)}</td>
                    <td className="num whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {p.expiryDate ? formatShortDate(p.expiryDate) : "—"}
                    </td>
                    <td className="px-3 py-3 pr-5">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Shell>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labels,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="bg-transparent text-xs font-medium text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-foreground">
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}
