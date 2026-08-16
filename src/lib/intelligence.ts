import {
  PRODUCT_SEEDS,
  SUPPLIERS,
  type Category,
  type ProductSeed,
  type Supplier,
} from "@/data/catalog";

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

/** Stable string hash -> [0,1). Same input always yields same output. */
function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export const HISTORY_DAYS = 30;

/** Reference "today" — normalised to midnight so numbers never drift mid-session. */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** ₹ formatting with Indian lakh/crore compaction. */
export function inr(value: number, compact = false): string {
  const v = Math.round(value);
  if (compact) {
    if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  }
  return `₹${v.toLocaleString("en-IN")}`;
}

export function round(v: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round(v * f) / f;
}

/* ------------------------------------------------------------------ */
/* Derived product model                                               */
/* ------------------------------------------------------------------ */

export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

export type StockStatus =
  | "Critical"
  | "Low Stock"
  | "Expiring Soon"
  | "Dead Stock"
  | "Overstock"
  | "Watch"
  | "Healthy";

export interface SalesPoint {
  /** Days before today. 29 = oldest, 0 = yesterday-ish (most recent complete day). */
  daysAgo: number;
  date: Date;
  units: number;
}

export interface ForecastPoint {
  dayOffset: number; // 1..30 into the future
  date: Date;
  units: number;
  projectedStock: number;
}

export interface Product extends ProductSeed {
  supplier: Supplier;
  leadTimeDays: number;
  history: SalesPoint[];
  avgDaily: number; // trailing 14-day average
  prevAvgDaily: number; // the 14 days before that
  trendPct: number; // % change between the two windows
  trendLabel: "Accelerating" | "Rising" | "Stable" | "Declining" | "Collapsing";
  forecastDaily: number; // next-7-day average daily demand
  daysRemaining: number;
  stockoutDate: Date | null;
  inventoryValue: number;
  retailValue: number;
  marginPct: number;
  expiryDate: Date | null;
  daysToExpiry: number | null;
  safetyStock: number;
  computedReorderPoint: number;
  recommendedOrderQty: number;
  reorderCost: number;
  stockoutRisk: number; // 0-100
  deadStockRisk: number; // 0-100
  expiryRisk: number; // 0-100
  overstockDays: number;
  healthScore: number; // 0-100
  status: StockStatus;
  riskLevel: RiskLevel;
  confidence: number; // forecast confidence 0-100
}

function weekdayFactor(date: Date): number {
  // Retail seasonality: weekends heavier, midweek lighter.
  const factors = [1.08, 0.9, 0.92, 0.96, 1.02, 1.18, 1.24]; // Sun..Sat
  return factors[date.getDay()] ?? 1;
}

function buildHistory(seed: ProductSeed, base: Date): SalesPoint[] {
  const points: SalesPoint[] = [];
  for (let daysAgo = HISTORY_DAYS; daysAgo >= 1; daysAgo--) {
    const date = addDays(base, -daysAgo);
    const progress = (HISTORY_DAYS - daysAgo) / (HISTORY_DAYS - 1); // 0 -> 1 (older -> newer)
    const trendMul = 1 + (seed.trend - 1) * progress;
    const jitter = 0.88 + hash01(`${seed.sku}:${daysAgo}`) * 0.24; // 0.88 - 1.12
    let units = seed.baseDaily * trendMul * weekdayFactor(date) * jitter;
    // Products that stopped moving genuinely stop moving.
    if (daysAgo < seed.lastMovementDaysAgo) units = 0;
    points.push({ daysAgo, date, units: Math.max(0, Math.round(units)) });
  }
  return points;
}

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function trendLabelFor(pct: number): Product["trendLabel"] {
  if (pct >= 25) return "Accelerating";
  if (pct >= 8) return "Rising";
  if (pct > -8) return "Stable";
  if (pct > -30) return "Declining";
  return "Collapsing";
}

function buildProduct(seed: ProductSeed, base: Date): Product {
  const supplier = SUPPLIERS.find((s) => s.id === seed.supplierId)!;
  const leadTimeDays = supplier.leadTimeDays;
  const history = buildHistory(seed, base);

  const recent = history.filter((p) => p.daysAgo <= 14).map((p) => p.units);
  const previous = history.filter((p) => p.daysAgo > 14 && p.daysAgo <= 28).map((p) => p.units);
  const avgDaily = round(mean(recent), 2);
  const prevAvgDaily = round(mean(previous), 2);
  const trendPct = prevAvgDaily > 0 ? round(((avgDaily - prevAvgDaily) / prevAvgDaily) * 100, 1) : 0;

  // Forecast: continue the observed trend, damped, capped at ±40% over 30 days.
  const dailyGrowth = Math.max(-0.02, Math.min(0.02, trendPct / 100 / 14));
  const forecastAt = (dayOffset: number) =>
    Math.max(0, avgDaily * (1 + dailyGrowth * dayOffset) * weekdayFactor(addDays(base, dayOffset)));
  const forecastDaily = round(mean([1, 2, 3, 4, 5, 6, 7].map(forecastAt)), 2);

  // Days of cover using forecast demand.
  let remainingStock = seed.stock;
  let stockoutDate: Date | null = null;
  let daysRemaining = 999;
  for (let d = 1; d <= 120; d++) {
    remainingStock -= forecastAt(d);
    if (remainingStock <= 0 && !stockoutDate) {
      stockoutDate = addDays(base, d);
      daysRemaining = d;
      break;
    }
  }
  if (!stockoutDate) daysRemaining = avgDaily > 0 ? Math.min(999, round(seed.stock / avgDaily, 1)) : 999;

  const inventoryValue = seed.stock * seed.cost;
  const retailValue = seed.stock * seed.price;
  const marginPct = round(((seed.price - seed.cost) / seed.price) * 100, 1);

  const expiryDate = seed.expiryInDays === null ? null : addDays(base, seed.expiryInDays);
  const daysToExpiry = seed.expiryInDays;

  // Safety stock = half a lead time of demand, adjusted for supplier reliability.
  const reliabilityBuffer = 1 + (100 - supplier.reliability) / 100;
  const safetyStock = Math.ceil(forecastDaily * (leadTimeDays / 2) * reliabilityBuffer);
  const computedReorderPoint = Math.ceil(forecastDaily * leadTimeDays + safetyStock);
  const targetCover = leadTimeDays + 14; // reorder up to lead time + 2 weeks of cover
  const recommendedOrderQty = Math.max(
    0,
    Math.ceil(forecastDaily * targetCover + safetyStock - seed.stock),
  );
  const reorderCost = recommendedOrderQty * seed.cost;

  // ---- Risk scoring (deterministic, bounded 0-100) ----
  const coverRatio = daysRemaining / Math.max(1, leadTimeDays);
  let stockoutRisk = 0;
  if (avgDaily > 0.2) {
    if (coverRatio <= 0.5) stockoutRisk = 96;
    else if (coverRatio <= 1) stockoutRisk = 88;
    else if (coverRatio <= 1.5) stockoutRisk = 72;
    else if (coverRatio <= 2.5) stockoutRisk = 52;
    else if (coverRatio <= 4) stockoutRisk = 28;
    else stockoutRisk = 8;
    if (trendPct >= 20) stockoutRisk = Math.min(99, stockoutRisk + 6);
    if (supplier.reliability < 85) stockoutRisk = Math.min(99, stockoutRisk + 4);
    if (seed.stock < seed.reorderPoint) stockoutRisk = Math.min(99, stockoutRisk + 3);
  }

  const daysSinceMovement = seed.lastMovementDaysAgo;
  const overstockDays = avgDaily > 0 ? round(seed.stock / avgDaily, 0) : 999;
  let deadStockRisk = 0;
  if (daysSinceMovement >= 30) deadStockRisk = 94;
  else if (daysSinceMovement >= 21) deadStockRisk = 80;
  else if (daysSinceMovement >= 14) deadStockRisk = 62;
  else if (overstockDays > 120) deadStockRisk = 58;
  else if (overstockDays > 75) deadStockRisk = 38;
  if (trendPct <= -25 && overstockDays > 45) deadStockRisk = Math.max(deadStockRisk, 55);

  let expiryRisk = 0;
  if (daysToExpiry !== null) {
    const sellThroughByExpiry = forecastDaily * daysToExpiry;
    const atRiskUnits = Math.max(0, seed.stock - sellThroughByExpiry);
    const atRiskShare = seed.stock > 0 ? atRiskUnits / seed.stock : 0;
    if (daysToExpiry <= 7) expiryRisk = Math.round(70 + atRiskShare * 30);
    else if (daysToExpiry <= 30) expiryRisk = Math.round(45 + atRiskShare * 45);
    else if (daysToExpiry <= 60) expiryRisk = Math.round(20 + atRiskShare * 45);
    else expiryRisk = Math.round(atRiskShare * 25);
  }

  const healthScore = Math.max(
    0,
    Math.round(100 - stockoutRisk * 0.42 - deadStockRisk * 0.3 - expiryRisk * 0.28),
  );

  let status: StockStatus = "Healthy";
  if (stockoutRisk >= 85) status = "Critical";
  else if (expiryRisk >= 70) status = "Expiring Soon";
  else if (deadStockRisk >= 75) status = "Dead Stock";
  else if (stockoutRisk >= 65) status = "Low Stock";
  else if (deadStockRisk >= 50 || overstockDays > 90) status = "Overstock";
  else if (stockoutRisk >= 45 || expiryRisk >= 40 || deadStockRisk >= 35) status = "Watch";

  const topRisk = Math.max(stockoutRisk, deadStockRisk, expiryRisk);
  const riskLevel: RiskLevel =
    topRisk >= 85 ? "critical" : topRisk >= 65 ? "high" : topRisk >= 40 ? "medium" : topRisk >= 15 ? "low" : "none";

  // Confidence: stable demand + enough volume = higher confidence.
  const volatility = Math.abs(trendPct);
  const confidence = Math.max(
    52,
    Math.min(96, Math.round(94 - volatility * 0.35 - (avgDaily < 2 ? 14 : 0))),
  );

  return {
    ...seed,
    supplier,
    leadTimeDays,
    history,
    avgDaily,
    prevAvgDaily,
    trendPct,
    trendLabel: trendLabelFor(trendPct),
    forecastDaily,
    daysRemaining,
    stockoutDate,
    inventoryValue,
    retailValue,
    marginPct,
    expiryDate,
    daysToExpiry,
    safetyStock,
    computedReorderPoint,
    recommendedOrderQty,
    reorderCost,
    stockoutRisk,
    deadStockRisk,
    expiryRisk,
    overstockDays,
    healthScore,
    status,
    riskLevel,
    confidence,
  };
}

let cache: Product[] | null = null;

export function getProducts(): Product[] {
  if (cache) return cache;
  const base = today();
  cache = PRODUCT_SEEDS.map((s) => buildProduct(s, base));
  return cache;
}

export function getProduct(sku: string): Product | undefined {
  return getProducts().find((p) => p.sku === sku);
}

/** Forward projection used by charts and the simulator. */
export function projectProduct(
  product: Product,
  days: number,
  opts: { demandMultiplier?: number } = {},
): ForecastPoint[] {
  const base = today();
  const mul = opts.demandMultiplier ?? 1;
  const dailyGrowth = Math.max(-0.02, Math.min(0.02, product.trendPct / 100 / 14));
  let stock = product.stock;
  const out: ForecastPoint[] = [];
  for (let d = 1; d <= days; d++) {
    const units =
      Math.max(0, product.avgDaily * (1 + dailyGrowth * d) * weekdayFactor(addDays(base, d))) * mul;
    stock = stock - units;
    out.push({
      dayOffset: d,
      date: addDays(base, d),
      units: round(units, 1),
      projectedStock: Math.max(0, round(stock, 0)),
    });
  }
  return out;
}

export function categoriesOf(products: Product[]): Category[] {
  return Array.from(new Set(products.map((p) => p.category))) as Category[];
}