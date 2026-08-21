// Deterministic geography layer for StockPilot AI.
// Locations, supplier hubs and per-location rollups are derived from the
// existing demo catalogue — no random values anywhere.

import { SUPPLIERS, type Category } from "@/data/catalog";
import { getProducts, type Product } from "@/lib/intelligence";

export interface GeoNode {
  id: string;
  name: string;
  city: string;
  state: string;
  kind: "Distribution Centre" | "Retail Hub" | "Dark Store";
  lat: number;
  lng: number;
}

/** Eight demo locations across India — fixed coordinates, fixed order. */
export const LOCATIONS: GeoNode[] = [
  { id: "LOC-01", name: "Mumbai Central DC", city: "Mumbai", state: "Maharashtra", kind: "Distribution Centre", lat: 19.076, lng: 72.877 },
  { id: "LOC-02", name: "Delhi NCR Hub", city: "Delhi", state: "Delhi NCR", kind: "Distribution Centre", lat: 28.644, lng: 77.216 },
  { id: "LOC-03", name: "Bengaluru South Hub", city: "Bengaluru", state: "Karnataka", kind: "Retail Hub", lat: 12.972, lng: 77.594 },
  { id: "LOC-04", name: "Hyderabad Hub", city: "Hyderabad", state: "Telangana", kind: "Retail Hub", lat: 17.385, lng: 78.487 },
  { id: "LOC-05", name: "Chennai Coast Store", city: "Chennai", state: "Tamil Nadu", kind: "Dark Store", lat: 13.083, lng: 80.27 },
  { id: "LOC-06", name: "Kolkata East Store", city: "Kolkata", state: "West Bengal", kind: "Dark Store", lat: 22.573, lng: 88.364 },
  { id: "LOC-07", name: "Pune West Store", city: "Pune", state: "Maharashtra", kind: "Dark Store", lat: 18.52, lng: 73.857 },
  { id: "LOC-08", name: "Ahmedabad North Store", city: "Ahmedabad", state: "Gujarat", kind: "Retail Hub", lat: 23.023, lng: 72.571 },
];

/** Each supplier ships from one fixed origin city. */
export const SUPPLIER_ORIGINS: Record<string, { city: string; lat: number; lng: number; servesLocationIds: string[] }> = {
  "SUP-01": { city: "Anand", lat: 22.556, lng: 72.955, servesLocationIds: ["LOC-01", "LOC-07", "LOC-08"] },
  "SUP-02": { city: "Mysuru", lat: 12.295, lng: 76.639, servesLocationIds: ["LOC-03", "LOC-05"] },
  "SUP-03": { city: "Indore", lat: 22.719, lng: 75.857, servesLocationIds: ["LOC-02", "LOC-08", "LOC-01"] },
  "SUP-04": { city: "Nagpur", lat: 21.146, lng: 79.088, servesLocationIds: ["LOC-04", "LOC-06"] },
  "SUP-05": { city: "Ludhiana", lat: 30.901, lng: 75.857, servesLocationIds: ["LOC-02", "LOC-06"] },
  "SUP-06": { city: "Coimbatore", lat: 11.017, lng: 76.956, servesLocationIds: ["LOC-05", "LOC-03", "LOC-04"] },
};

/** Deterministic SKU -> location assignment (stable ordering of the catalogue). */
export function locationOfIndex(index: number): GeoNode {
  return LOCATIONS[index % LOCATIONS.length]!;
}

export interface LocationRollup {
  node: GeoNode;
  products: Product[];
  skus: number;
  units: number;
  inventoryValue: number;
  retailValue: number;
  criticalCount: number;
  deadStockValue: number;
  expiryValue: number;
  avgStockoutRisk: number;
  healthScore: number;
  riskScore: number; // 0-100 composite, higher = worse
  topCategory: Category;
  suppliers: { id: string; name: string; reliability: number; leadTimeDays: number }[];
}

export type RiskLens = "composite" | "stockout" | "dead" | "expiry";

export function buildLocationRollups(products: Product[] = getProducts()): LocationRollup[] {
  const buckets = new Map<string, Product[]>();
  LOCATIONS.forEach((l) => buckets.set(l.id, []));
  products.forEach((p, i) => {
    buckets.get(locationOfIndex(i).id)!.push(p);
  });

  return LOCATIONS.map((node) => {
    const list = buckets.get(node.id)!;
    const inventoryValue = list.reduce((s, p) => s + p.inventoryValue, 0);
    const retailValue = list.reduce((s, p) => s + p.retailValue, 0);
    const units = list.reduce((s, p) => s + p.stock, 0);
    const deadStockValue = list.filter((p) => p.deadStockRisk >= 50).reduce((s, p) => s + p.inventoryValue, 0);
    const expiryValue = list
      .filter((p) => p.daysToExpiry !== null && p.daysToExpiry <= 30)
      .reduce((s, p) => s + p.inventoryValue, 0);
    const avgStockoutRisk = list.length
      ? Math.round(list.reduce((s, p) => s + p.stockoutRisk, 0) / list.length)
      : 0;
    const healthScore = list.length
      ? Math.round(list.reduce((s, p) => s + p.healthScore, 0) / list.length)
      : 100;
    const criticalCount = list.filter((p) => p.riskLevel === "critical").length;

    const catTotals = new Map<Category, number>();
    list.forEach((p) => catTotals.set(p.category, (catTotals.get(p.category) ?? 0) + p.inventoryValue));
    const topCategory = [...catTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Groceries";

    const supplierIds = Object.entries(SUPPLIER_ORIGINS)
      .filter(([, origin]) => origin.servesLocationIds.includes(node.id))
      .map(([id]) => id);
    const suppliers = supplierIds.map((id) => {
      const s = SUPPLIERS.find((x) => x.id === id)!;
      return { id: s.id, name: s.name, reliability: s.reliability, leadTimeDays: s.leadTimeDays };
    });

    const riskScore = Math.min(
      100,
      Math.round(
        avgStockoutRisk * 0.45 +
          ((deadStockValue + expiryValue) / Math.max(1, inventoryValue)) * 100 * 0.35 +
          (criticalCount / Math.max(1, list.length)) * 100 * 0.2,
      ),
    );

    return {
      node,
      products: list,
      skus: list.length,
      units,
      inventoryValue,
      retailValue,
      criticalCount,
      deadStockValue,
      expiryValue,
      avgStockoutRisk,
      healthScore,
      riskScore,
      topCategory,
      suppliers,
    };
  });
}

export function lensValue(r: LocationRollup, lens: RiskLens): number {
  if (lens === "stockout") return r.avgStockoutRisk;
  if (lens === "dead") return Math.round((r.deadStockValue / Math.max(1, r.inventoryValue)) * 100);
  if (lens === "expiry") return Math.round((r.expiryValue / Math.max(1, r.inventoryValue)) * 100);
  return r.riskScore;
}

export const LENS_LABEL: Record<RiskLens, string> = {
  composite: "Composite risk",
  stockout: "Stockout risk",
  dead: "Dead stock share",
  expiry: "Expiry share",
};

/* --------------- projection for the SVG map --------------- */

const BOUNDS = { minLng: 68, maxLng: 92, minLat: 8, maxLat: 33 };

export function project(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height;
  return { x, y };
}

export function riskTone(value: number): { fill: string; text: string; label: string } {
  if (value >= 65) return { fill: "var(--critical)", text: "text-critical", label: "High" };
  if (value >= 45) return { fill: "var(--warning)", text: "text-warning", label: "Elevated" };
  if (value >= 25) return { fill: "var(--info)", text: "text-info", label: "Moderate" };
  return { fill: "var(--success)", text: "text-success", label: "Low" };
}
