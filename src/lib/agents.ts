/**
 * StockPilot AI — agent layer.
 *
 * Six specialised agents produce findings from deterministic inventory maths.
 * The Inventory Orchestrator collects them, de-duplicates conflicts per SKU,
 * scores them through the Priority Engine and emits a business action plan.
 */
import {
  getProducts,
  inr,
  round,
  type Product,
  type RiskLevel,
} from "@/lib/intelligence";

export type AgentId =
  | "health"
  | "forecast"
  | "reorder"
  | "deadstock"
  | "expiry"
  | "analytics";

export interface AgentMeta {
  id: AgentId;
  name: string;
  role: string;
}

export const AGENTS: AgentMeta[] = [
  { id: "health", name: "Inventory Health Agent", role: "Stock levels, coverage & health scoring" },
  { id: "forecast", name: "Demand Forecast Agent", role: "Trend detection & stockout prediction" },
  { id: "reorder", name: "Smart Reorder Agent", role: "When, what and how much to reorder" },
  { id: "deadstock", name: "Dead Stock Agent", role: "Non-moving inventory & trapped capital" },
  { id: "expiry", name: "Expiry Risk Agent", role: "Shelf-life exposure & value at risk" },
  { id: "analytics", name: "Business Analytics Agent", role: "Executive-level inventory economics" },
];

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Finding {
  id: string;
  agent: AgentId;
  sku: string;
  product: string;
  category: string;
  /** What is happening */
  problem: string;
  /** What data supports it */
  evidence: { label: string; value: string }[];
  /** What the business should do */
  action: string;
  actionType: "Reorder" | "Discount" | "Prioritise Sales" | "Monitor" | "Stop Purchasing" | "Transfer";
  /** Why it matters */
  impact: string;
  impactValue: number; // ₹ at stake — drives the priority engine
  risk: RiskLevel;
  reasoning: string;
  score: number;
  priority: Priority;
}

function priorityOf(score: number): Priority {
  if (score >= 78) return "CRITICAL";
  if (score >= 58) return "HIGH";
  if (score >= 38) return "MEDIUM";
  return "LOW";
}

/** Priority Engine — blends urgency, financial exposure and risk type. */
function scoreFinding(opts: {
  urgency: number; // 0-100
  impactValue: number; // ₹
  weight: number; // agent weight
}): number {
  const financial = Math.min(100, (opts.impactValue / 60000) * 100);
  return round(Math.min(100, opts.urgency * 0.62 + financial * 0.24 + opts.weight * 0.14), 1);
}

function finalise(f: Omit<Finding, "score" | "priority">, urgency: number, weight: number): Finding {
  const score = scoreFinding({ urgency, impactValue: f.impactValue, weight });
  return { ...f, score, priority: priorityOf(score) };
}

/* ------------------------------------------------------------------ */
/* A. Inventory Health Agent                                           */
/* ------------------------------------------------------------------ */

export interface HealthReport {
  score: number;
  totalSkus: number;
  critical: Product[];
  low: Product[];
  overstock: Product[];
  healthy: Product[];
  totalValue: number;
  findings: Finding[];
}

export function inventoryHealthAgent(products: Product[] = getProducts()): HealthReport {
  const critical = products.filter((p) => p.status === "Critical");
  const low = products.filter((p) => p.status === "Low Stock");
  const overstock = products.filter((p) => p.status === "Overstock");
  const healthy = products.filter((p) => p.status === "Healthy");
  const totalValue = products.reduce((s, p) => s + p.inventoryValue, 0);
  const score = Math.round(
    products.reduce((s, p) => s + p.healthScore * p.inventoryValue, 0) / Math.max(1, totalValue),
  );

  const findings = [...critical, ...low].map((p) =>
    finalise(
      {
        id: `health-${p.sku}`,
        agent: "health",
        sku: p.sku,
        product: p.name,
        category: p.category,
        problem: `Stock cover has fallen to ${round(p.daysRemaining, 1)} days against a ${p.leadTimeDays}-day supplier lead time.`,
        evidence: [
          { label: "Current stock", value: `${p.stock} units` },
          { label: "Avg daily sales (14d)", value: `${p.avgDaily} units/day` },
          { label: "Estimated coverage", value: `${round(p.daysRemaining, 1)} days` },
          { label: "Reorder point", value: `${p.reorderPoint} units` },
          { label: "Supplier lead time", value: `${p.leadTimeDays} days` },
        ],
        action: `Raise a purchase order for ${p.recommendedOrderQty} units of ${p.name}.`,
        actionType: "Reorder",
        impact: `Protects roughly ${inr(p.avgDaily * p.leadTimeDays * p.price)} of sales that would be lost during the stockout window.`,
        impactValue: p.avgDaily * p.leadTimeDays * p.price,
        risk: p.riskLevel,
        reasoning: `Reorder because current stock covers approximately ${round(p.daysRemaining, 1)} days while supplier lead time is ${p.leadTimeDays} days. Demand is ${p.trendLabel.toLowerCase()} (${p.trendPct > 0 ? "+" : ""}${p.trendPct}% vs the prior 14 days).`,
      },
      p.stockoutRisk,
      92,
    ),
  );

  return { score, totalSkus: products.length, critical, low, overstock, healthy, totalValue, findings };
}

/* ------------------------------------------------------------------ */
/* B. Demand Forecast Agent                                            */
/* ------------------------------------------------------------------ */

export interface ForecastReport {
  accelerating: Product[];
  declining: Product[];
  stockoutsIn7Days: Product[];
  stockoutsIn30Days: Product[];
  findings: Finding[];
}

export function demandForecastAgent(products: Product[] = getProducts()): ForecastReport {
  const accelerating = [...products]
    .filter((p) => p.trendPct >= 15 && p.avgDaily >= 1)
    .sort((a, b) => b.trendPct - a.trendPct);
  const declining = [...products]
    .filter((p) => p.trendPct <= -15)
    .sort((a, b) => a.trendPct - b.trendPct);
  const stockoutsIn7Days = products.filter((p) => p.daysRemaining <= 7 && p.avgDaily > 0.2);
  const stockoutsIn30Days = products.filter((p) => p.daysRemaining <= 30 && p.avgDaily > 0.2);

  const findings = accelerating
    .filter((p) => p.daysRemaining > 7 && p.daysRemaining <= 25)
    .map((p) =>
      finalise(
        {
          id: `forecast-${p.sku}`,
          agent: "forecast",
          sku: p.sku,
          product: p.name,
          category: p.category,
          problem: `Demand is accelerating ${p.trendPct}% and will pull the stockout date forward.`,
          evidence: [
            { label: "Avg daily sales (14d)", value: `${p.avgDaily} units/day` },
            { label: "Previous 14d", value: `${p.prevAvgDaily} units/day` },
            { label: "Forecast next 7d", value: `${p.forecastDaily} units/day` },
            { label: "Projected stockout", value: `${round(p.daysRemaining, 0)} days away` },
            { label: "Forecast confidence", value: `${p.confidence}%` },
          ],
          action: `Monitor ${p.name} daily and bring the next purchase order forward.`,
          actionType: "Monitor",
          impact: `Demand growth of ${p.trendPct}% adds roughly ${Math.round((p.forecastDaily - p.prevAvgDaily) * 30)} units of monthly demand.`,
          impactValue: Math.max(0, (p.forecastDaily - p.prevAvgDaily) * 30 * p.price),
          risk: p.riskLevel,
          reasoning: `Trailing 14-day demand rose from ${p.prevAvgDaily} to ${p.avgDaily} units/day. At the forecast rate of ${p.forecastDaily} units/day, existing stock of ${p.stock} units lasts ${round(p.daysRemaining, 1)} days.`,
        },
        Math.min(88, 40 + p.trendPct),
        70,
      ),
    );

  return { accelerating, declining, stockoutsIn7Days, stockoutsIn30Days, findings };
}

/* ------------------------------------------------------------------ */
/* C. Smart Reorder Agent                                              */
/* ------------------------------------------------------------------ */

export interface ReorderLine {
  product: Product;
  quantity: number;
  cost: number;
  urgency: Priority;
  explanation: string;
}

export interface ReorderReport {
  lines: ReorderLine[];
  totalCost: number;
  findings: Finding[];
}

export function smartReorderAgent(products: Product[] = getProducts()): ReorderReport {
  const candidates = products.filter(
    (p) => p.recommendedOrderQty > 0 && p.avgDaily > 0.2 && p.daysRemaining <= p.leadTimeDays + 10,
  );

  const lines: ReorderLine[] = candidates
    .map((p) => {
      const urgency = priorityOf(
        scoreFinding({ urgency: p.stockoutRisk, impactValue: p.avgDaily * p.leadTimeDays * p.price, weight: 90 }),
      );
      return {
        product: p,
        quantity: p.recommendedOrderQty,
        cost: p.reorderCost,
        urgency,
        explanation: `Recommended because current stock covers approximately ${round(p.daysRemaining, 1)} days while supplier lead time is ${p.leadTimeDays} days. Order quantity = forecast demand over ${p.leadTimeDays + 14} days (${Math.ceil(p.forecastDaily * (p.leadTimeDays + 14))} units) + safety stock (${p.safetyStock}) − current stock (${p.stock}).`,
      };
    })
    .sort((a, b) => a.product.daysRemaining - b.product.daysRemaining);

  const totalCost = lines.reduce((s, l) => s + l.cost, 0);

  const findings = lines
    .filter((l) => l.urgency === "CRITICAL" || l.urgency === "HIGH")
    .map((l) =>
      finalise(
        {
          id: `reorder-${l.product.sku}`,
          agent: "reorder",
          sku: l.product.sku,
          product: l.product.name,
          category: l.product.category,
          problem: `Projected demand exceeds available inventory before the supplier lead time completes.`,
          evidence: [
            { label: "Current stock", value: `${l.product.stock} units` },
            { label: "Avg daily sales", value: `${l.product.avgDaily} units/day` },
            { label: "Coverage", value: `${round(l.product.daysRemaining, 1)} days` },
            { label: "Lead time", value: `${l.product.leadTimeDays} days (${l.product.supplier.name})` },
            { label: "Safety stock", value: `${l.product.safetyStock} units` },
            { label: "Recommended qty", value: `${l.quantity} units · ${inr(l.cost)}` },
          ],
          action: `Place a reorder for ${l.quantity} units immediately (${inr(l.cost)}).`,
          actionType: "Reorder",
          impact: `Prevents an estimated ${inr(l.product.avgDaily * l.product.leadTimeDays * l.product.price)} of lost revenue and protects shelf availability.`,
          impactValue: l.product.avgDaily * l.product.leadTimeDays * l.product.price,
          risk: l.product.riskLevel,
          reasoning: l.explanation,
        },
        l.product.stockoutRisk,
        96,
      ),
    );

  return { lines, totalCost, findings };
}

/* ------------------------------------------------------------------ */
/* D. Dead Stock Agent                                                 */
/* ------------------------------------------------------------------ */

export interface DeadStockReport {
  items: Product[];
  totalValue: number;
  avgDaysWithoutMovement: number;
  findings: Finding[];
}

export function deadStockAgent(products: Product[] = getProducts()): DeadStockReport {
  const items = products
    .filter((p) => p.deadStockRisk >= 50)
    .sort((a, b) => b.inventoryValue - a.inventoryValue);
  const totalValue = items.reduce((s, p) => s + p.inventoryValue, 0);
  const avgDaysWithoutMovement = items.length
    ? round(items.reduce((s, p) => s + p.lastMovementDaysAgo, 0) / items.length, 0)
    : 0;

  const findings = items.map((p) => {
    const stale = p.lastMovementDaysAgo >= 21;
    return finalise(
      {
        id: `dead-${p.sku}`,
        agent: "deadstock",
        sku: p.sku,
        product: p.name,
        category: p.category,
        problem: stale
          ? `No recorded movement for ${p.lastMovementDaysAgo} days with ${p.stock} units on hand.`
          : `Stock cover of ${p.overstockDays} days far exceeds a healthy 45-day window.`,
        evidence: [
          { label: "Units on hand", value: `${p.stock} units` },
          { label: "Last movement", value: `${p.lastMovementDaysAgo} days ago` },
          { label: "Avg daily sales", value: `${p.avgDaily} units/day` },
          { label: "Cover at current rate", value: `${p.overstockDays} days` },
          { label: "Capital tied up", value: inr(p.inventoryValue) },
        ],
        action: stale
          ? `Run a clearance discount on ${p.name} and stop further purchasing.`
          : `Push a promotion on ${p.name} to accelerate sell-through.`,
        actionType: stale ? "Stop Purchasing" : "Discount",
        impact: `Frees up to ${inr(p.inventoryValue * 0.7)} of working capital currently trapped in slow inventory.`,
        impactValue: p.inventoryValue * 0.7,
        risk: p.riskLevel,
        reasoning: `${p.stock} units × ${inr(p.cost)} cost = ${inr(p.inventoryValue)} of capital against ${p.avgDaily} units/day of demand — that is ${p.overstockDays} days of cover, ${stale ? `and nothing has moved in ${p.lastMovementDaysAgo} days` : "well beyond the 45-day target"}.`,
      },
      Math.min(80, p.deadStockRisk),
      64,
    );
  });

  return { items, totalValue, avgDaysWithoutMovement, findings };
}

/* ------------------------------------------------------------------ */
/* E. Expiry Risk Agent                                                */
/* ------------------------------------------------------------------ */

export type ExpiryBand = "Critical" | "High" | "Medium";

export interface ExpiryItem {
  product: Product;
  band: ExpiryBand;
  unitsAtRisk: number;
  valueAtRisk: number;
}

export interface ExpiryReport {
  items: ExpiryItem[];
  totalValueAtRisk: number;
  totalUnitsAtRisk: number;
  findings: Finding[];
}

export function expiryRiskAgent(products: Product[] = getProducts()): ExpiryReport {
  const items: ExpiryItem[] = products
    .filter((p) => p.daysToExpiry !== null && p.daysToExpiry <= 60)
    .map((p) => {
      const days = p.daysToExpiry!;
      const sellThrough = p.forecastDaily * days;
      const unitsAtRisk = Math.max(0, Math.round(p.stock - sellThrough));
      const band: ExpiryBand = days <= 7 ? "Critical" : days <= 30 ? "High" : "Medium";
      return { product: p, band, unitsAtRisk, valueAtRisk: unitsAtRisk * p.cost };
    })
    .filter((i) => i.unitsAtRisk > 0)
    .sort((a, b) => (a.product.daysToExpiry ?? 0) - (b.product.daysToExpiry ?? 0));

  const totalValueAtRisk = items.reduce((s, i) => s + i.valueAtRisk, 0);
  const totalUnitsAtRisk = items.reduce((s, i) => s + i.unitsAtRisk, 0);

  const findings = items.map((i) => {
    const p = i.product;
    const days = p.daysToExpiry!;
    return finalise(
      {
        id: `expiry-${p.sku}`,
        agent: "expiry",
        sku: p.sku,
        product: p.name,
        category: p.category,
        problem: `${i.unitsAtRisk} units will not sell through before expiry in ${days} days.`,
        evidence: [
          { label: "Days to expiry", value: `${days} days` },
          { label: "Units on hand", value: `${p.stock} units` },
          { label: "Forecast sell-through", value: `${Math.round(p.forecastDaily * days)} units by expiry` },
          { label: "Units at risk", value: `${i.unitsAtRisk} units` },
          { label: "Value at risk", value: inr(i.valueAtRisk) },
        ],
        action:
          i.band === "Critical"
            ? `Prioritise selling ${p.name} today — front-of-store placement plus markdown.`
            : i.band === "High"
              ? `Run a targeted discount on ${p.name} to clear ${i.unitsAtRisk} units.`
              : `Plan a promotion or store transfer for ${p.name} within the next fortnight.`,
        actionType: i.band === "Critical" ? "Prioritise Sales" : i.band === "High" ? "Discount" : "Transfer",
        impact: `Avoids writing off ${inr(i.valueAtRisk)} of inventory.`,
        impactValue: i.valueAtRisk,
        risk: i.band === "Critical" ? "critical" : i.band === "High" ? "high" : "medium",
        reasoning: `At the forecast rate of ${p.forecastDaily} units/day, only ${Math.round(p.forecastDaily * days)} of ${p.stock} units will sell before the ${days}-day expiry window closes, leaving ${i.unitsAtRisk} units (${inr(i.valueAtRisk)}) exposed.`,
      },
      p.expiryRisk,
      80,
    );
  });

  return { items, totalValueAtRisk, totalUnitsAtRisk, findings };
}

/* ------------------------------------------------------------------ */
/* F. Business Analytics Agent                                         */
/* ------------------------------------------------------------------ */

export interface AnalyticsReport {
  totalInventoryValue: number;
  totalRetailValue: number;
  potentialMargin: number;
  healthScore: number;
  stockoutExposure: number;
  deadStockValue: number;
  expiryExposure: number;
  productsRequiringAction: number;
  efficiency: number;
  topPerformers: Product[];
  slowMovers: Product[];
  categoryBreakdown: { category: string; value: number; skus: number; risk: number }[];
  insights: string[];
}

export function businessAnalyticsAgent(products: Product[] = getProducts()): AnalyticsReport {
  const health = inventoryHealthAgent(products);
  const dead = deadStockAgent(products);
  const expiry = expiryRiskAgent(products);

  const totalInventoryValue = products.reduce((s, p) => s + p.inventoryValue, 0);
  const totalRetailValue = products.reduce((s, p) => s + p.retailValue, 0);
  const stockoutExposure = products
    .filter((p) => p.stockoutRisk >= 65)
    .reduce((s, p) => s + p.avgDaily * p.leadTimeDays * p.price, 0);

  const topPerformers = [...products]
    .sort((a, b) => b.avgDaily * b.price - a.avgDaily * a.price)
    .slice(0, 5);
  const slowMovers = [...products].sort((a, b) => b.overstockDays - a.overstockDays).slice(0, 5);

  const categoryBreakdown = Array.from(new Set(products.map((p) => p.category))).map((category) => {
    const inCat = products.filter((p) => p.category === category);
    return {
      category,
      value: inCat.reduce((s, p) => s + p.inventoryValue, 0),
      skus: inCat.length,
      risk: Math.round(inCat.reduce((s, p) => s + (100 - p.healthScore), 0) / inCat.length),
    };
  });

  const productsRequiringAction = products.filter(
    (p) => p.status !== "Healthy" && p.status !== "Watch",
  ).length;

  const efficiency = Math.round(
    100 - ((dead.totalValue + expiry.totalValueAtRisk) / Math.max(1, totalInventoryValue)) * 100,
  );

  const insights = [
    `Inventory health is ${health.score}/100 across ${products.length} active SKUs worth ${inr(totalInventoryValue, true)}.`,
    `${products.filter((p) => p.stockoutRisk >= 65).length} SKUs are at high stockout risk, putting ${inr(stockoutExposure, true)} of lead-time revenue in play.`,
    `${inr(dead.totalValue, true)} is tied up in ${dead.items.length} slow-moving SKUs averaging ${dead.avgDaysWithoutMovement} days without movement.`,
    `${inr(expiry.totalValueAtRisk, true)} of inventory across ${expiry.items.length} SKUs will expire before it can sell through.`,
    `Stock efficiency is ${efficiency}% — ${100 - efficiency}% of capital sits in at-risk inventory.`,
  ];

  return {
    totalInventoryValue,
    totalRetailValue,
    potentialMargin: totalRetailValue - totalInventoryValue,
    healthScore: health.score,
    stockoutExposure,
    deadStockValue: dead.totalValue,
    expiryExposure: expiry.totalValueAtRisk,
    productsRequiringAction,
    efficiency,
    topPerformers,
    slowMovers,
    categoryBreakdown,
    insights,
  };
}

/* ------------------------------------------------------------------ */
/* Inventory Orchestrator                                              */
/* ------------------------------------------------------------------ */

export interface OrchestrationResult {
  agentsConsulted: AgentMeta[];
  findings: Finding[];
  analytics: AnalyticsReport;
  health: HealthReport;
  forecast: ForecastReport;
  reorder: ReorderReport;
  deadstock: DeadStockReport;
  expiry: ExpiryReport;
  brief: string;
}

/** Conflict resolution: one action per SKU — the highest-scoring one wins. */
function resolveConflicts(findings: Finding[]): Finding[] {
  const best = new Map<string, Finding>();
  for (const f of findings) {
    const current = best.get(f.sku);
    if (!current || f.score > current.score) best.set(f.sku, f);
  }
  return Array.from(best.values()).sort((a, b) => b.score - a.score);
}

let orchestrationCache: OrchestrationResult | null = null;

export function orchestrate(products: Product[] = getProducts()): OrchestrationResult {
  if (orchestrationCache && products === getProducts()) return orchestrationCache;

  const health = inventoryHealthAgent(products);
  const forecast = demandForecastAgent(products);
  const reorder = smartReorderAgent(products);
  const deadstock = deadStockAgent(products);
  const expiry = expiryRiskAgent(products);
  const analytics = businessAnalyticsAgent(products);

  const findings = resolveConflicts([
    ...reorder.findings,
    ...health.findings,
    ...expiry.findings,
    ...deadstock.findings,
    ...forecast.findings,
  ]);

  const criticalReorders = findings.filter(
    (f) => f.actionType === "Reorder" && f.priority === "CRITICAL",
  ).length;
  const expiryActions = expiry.items.filter((i) => i.band !== "Medium").length;

  const brief = [
    `Inventory health is ${health.score}/100.`,
    `${products.filter((p) => p.stockoutRisk >= 65).length} SKUs are at high stockout risk.`,
    `${inr(deadstock.totalValue, true)} is tied up in slow-moving inventory.`,
    `${inr(expiry.totalValueAtRisk, true)} of inventory is at expiry risk.`,
    `The highest-priority action is to reorder ${criticalReorders} critical SKUs and accelerate sales of ${expiryActions} expiry-risk products.`,
  ].join(" ");

  const result: OrchestrationResult = {
    agentsConsulted: AGENTS,
    findings,
    analytics,
    health,
    forecast,
    reorder,
    deadstock,
    expiry,
    brief,
  };
  orchestrationCache = result;
  return result;
}

export function findingsForProduct(sku: string): Finding[] {
  const o = orchestrate();
  const all = [
    ...o.reorder.findings,
    ...o.health.findings,
    ...o.expiry.findings,
    ...o.deadstock.findings,
    ...o.forecast.findings,
  ];
  return all.filter((f) => f.sku === sku).sort((a, b) => b.score - a.score);
}