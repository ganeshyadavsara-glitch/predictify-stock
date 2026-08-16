import {
  orchestrate,
  type Finding,
  type AgentId,
  AGENTS,
} from "@/lib/agents";
import { getProducts, inr, round, type Product } from "@/lib/intelligence";

export interface CopilotMetric {
  label: string;
  value: string;
  tone?: "critical" | "warning" | "positive" | "neutral";
}

export interface CopilotAnswer {
  title: string;
  summary: string;
  agents: AgentId[];
  metrics: CopilotMetric[];
  findings: Finding[];
  followUps: string[];
}

export const SUGGESTED_QUESTIONS = [
  "What should I do today?",
  "Which products are most likely to stock out?",
  "What should I reorder?",
  "Show me dead stock.",
  "Which products are about to expire?",
  "Which products are selling faster than usual?",
  "Where is money tied up?",
  "Give me the top 5 inventory actions.",
  "Explain my inventory health.",
];

function matchProduct(question: string): Product | undefined {
  const q = question.toLowerCase();
  return getProducts().find(
    (p) => q.includes(p.name.toLowerCase()) || q.includes(p.sku.toLowerCase()),
  );
}

export function askCopilot(question: string): CopilotAnswer {
  const q = question.toLowerCase().trim();
  const o = orchestrate();
  const products = getProducts();

  // "Why is Product X risky?" — product-specific interrogation.
  const product = matchProduct(q);
  if (product && (q.includes("why") || q.includes("risk") || q.includes("explain") || q.includes("tell me"))) {
    const findings = o.findings.filter((f) => f.sku === product.sku);
    return {
      title: `${product.name} — risk breakdown`,
      summary: `${product.name} holds ${product.stock} units (${inr(product.inventoryValue)}) selling at ${product.avgDaily} units/day. Coverage is ${round(product.daysRemaining, 1)} days against a ${product.leadTimeDays}-day lead time from ${product.supplier.name}. Demand is ${product.trendLabel.toLowerCase()} at ${product.trendPct > 0 ? "+" : ""}${product.trendPct}%.`,
      agents: ["health", "forecast", "reorder"],
      metrics: [
        { label: "Stockout risk", value: `${product.stockoutRisk}%`, tone: product.stockoutRisk >= 65 ? "critical" : "neutral" },
        { label: "Days of cover", value: `${round(product.daysRemaining, 1)} d`, tone: product.daysRemaining < product.leadTimeDays ? "critical" : "positive" },
        { label: "Expiry risk", value: `${product.expiryRisk}%`, tone: product.expiryRisk >= 60 ? "warning" : "neutral" },
        { label: "Health score", value: `${product.healthScore}/100`, tone: product.healthScore < 50 ? "critical" : "positive" },
      ],
      findings,
      followUps: ["What should I reorder?", "What should I do today?"],
    };
  }

  const has = (...terms: string[]) => terms.some((t) => q.includes(t));

  if (has("stock out", "stockout", "run out", "likely to stock")) {
    const at = [...o.forecast.stockoutsIn30Days].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 6);
    return {
      title: "Predicted stockouts",
      summary: `${o.forecast.stockoutsIn7Days.length} SKUs are projected to stock out within 7 days and ${o.forecast.stockoutsIn30Days.length} within 30 days at current forecast demand. Lead times of ${Math.min(...at.map((p) => p.leadTimeDays))}–${Math.max(...at.map((p) => p.leadTimeDays))} days mean several are already past the safe reorder window.`,
      agents: ["forecast", "health", "reorder"],
      metrics: [
        { label: "Stockout in 7d", value: `${o.forecast.stockoutsIn7Days.length} SKUs`, tone: "critical" },
        { label: "Stockout in 30d", value: `${o.forecast.stockoutsIn30Days.length} SKUs`, tone: "warning" },
        { label: "Revenue exposure", value: inr(o.analytics.stockoutExposure, true), tone: "critical" },
      ],
      findings: o.findings.filter((f) => f.actionType === "Reorder").slice(0, 5),
      followUps: ["What should I reorder?", "Give me the top 5 inventory actions."],
    };
  }

  if (has("reorder", "purchase", "buy", "order")) {
    const urgent = o.reorder.lines.filter((l) => l.urgency === "CRITICAL" || l.urgency === "HIGH");
    return {
      title: "Reorder plan",
      summary: `${urgent.length} SKUs need a purchase order now out of ${o.reorder.lines.length} recommended lines. Total recommended spend is ${inr(o.reorder.totalCost, true)}, with ${inr(urgent.reduce((s, l) => s + l.cost, 0), true)} in the urgent tier.`,
      agents: ["reorder", "forecast", "health"],
      metrics: [
        { label: "Urgent SKUs", value: `${urgent.length}`, tone: "critical" },
        { label: "Total lines", value: `${o.reorder.lines.length}`, tone: "neutral" },
        { label: "Purchase value", value: inr(o.reorder.totalCost, true), tone: "neutral" },
      ],
      findings: o.findings.filter((f) => f.actionType === "Reorder").slice(0, 6),
      followUps: ["Which products are most likely to stock out?", "Where is money tied up?"],
    };
  }

  if (has("dead stock", "deadstock", "slow", "not moving", "non-moving")) {
    return {
      title: "Dead stock intelligence",
      summary: `${o.deadstock.items.length} SKUs are classified as dead or near-dead stock, locking ${inr(o.deadstock.totalValue, true)} of working capital. These items average ${o.deadstock.avgDaysWithoutMovement} days without recorded movement.`,
      agents: ["deadstock", "analytics"],
      metrics: [
        { label: "Dead SKUs", value: `${o.deadstock.items.length}`, tone: "warning" },
        { label: "Capital locked", value: inr(o.deadstock.totalValue, true), tone: "critical" },
        { label: "Avg idle days", value: `${o.deadstock.avgDaysWithoutMovement} d`, tone: "warning" },
      ],
      findings: o.findings.filter((f) => f.agent === "deadstock").slice(0, 6),
      followUps: ["Where is money tied up?", "Explain my inventory health."],
    };
  }

  if (has("expir", "shelf life", "perish")) {
    const critical = o.expiry.items.filter((i) => i.band === "Critical");
    return {
      title: "Expiry exposure",
      summary: `${o.expiry.items.length} SKUs carry stock that will not sell through before expiry — ${inr(o.expiry.totalValueAtRisk, true)} across ${o.expiry.totalUnitsAtRisk} units. ${critical.length} are inside the 7-day critical band and need action today.`,
      agents: ["expiry", "forecast"],
      metrics: [
        { label: "Critical (≤7d)", value: `${critical.length} SKUs`, tone: "critical" },
        { label: "Value at risk", value: inr(o.expiry.totalValueAtRisk, true), tone: "critical" },
        { label: "Units at risk", value: `${o.expiry.totalUnitsAtRisk}`, tone: "warning" },
      ],
      findings: o.findings.filter((f) => f.agent === "expiry").slice(0, 6),
      followUps: ["What should I do today?", "Show me dead stock."],
    };
  }

  if (has("faster", "trending", "accelerat", "growing", "demand")) {
    const fast = o.forecast.accelerating.slice(0, 6);
    return {
      title: "Demand acceleration",
      summary: `${o.forecast.accelerating.length} SKUs are selling faster than their prior 14-day baseline; ${o.forecast.declining.length} are declining. The fastest riser is ${fast[0]?.name ?? "—"} at ${fast[0]?.trendPct ?? 0}%.`,
      agents: ["forecast", "analytics"],
      metrics: [
        { label: "Accelerating", value: `${o.forecast.accelerating.length} SKUs`, tone: "positive" },
        { label: "Declining", value: `${o.forecast.declining.length} SKUs`, tone: "warning" },
        { label: "Top riser", value: `${fast[0]?.trendPct ?? 0}%`, tone: "positive" },
      ],
      findings: o.findings.filter((f) => f.agent === "forecast").slice(0, 5),
      followUps: ["Which products are most likely to stock out?", "What should I reorder?"],
    };
  }

  if (has("money", "capital", "tied up", "cash", "value")) {
    const a = o.analytics;
    return {
      title: "Where capital is trapped",
      summary: `Total inventory at cost is ${inr(a.totalInventoryValue, true)} against ${inr(a.totalRetailValue, true)} of retail value. ${inr(a.deadStockValue, true)} sits in slow movers and ${inr(a.expiryExposure, true)} is exposed to expiry — together ${100 - a.efficiency}% of your inventory capital.`,
      agents: ["analytics", "deadstock", "expiry"],
      metrics: [
        { label: "Inventory value", value: inr(a.totalInventoryValue, true), tone: "neutral" },
        { label: "Dead stock", value: inr(a.deadStockValue, true), tone: "critical" },
        { label: "Expiry exposure", value: inr(a.expiryExposure, true), tone: "warning" },
        { label: "Stock efficiency", value: `${a.efficiency}%`, tone: a.efficiency > 80 ? "positive" : "warning" },
      ],
      findings: o.findings.filter((f) => f.impactValue > 0).slice(0, 5),
      followUps: ["Show me dead stock.", "Which products are about to expire?"],
    };
  }

  if (has("health", "how is my inventory", "overview", "summary", "brief")) {
    const a = o.analytics;
    return {
      title: "Inventory health explained",
      summary: o.brief,
      agents: ["health", "analytics", "deadstock", "expiry"],
      metrics: [
        { label: "Health score", value: `${a.healthScore}/100`, tone: a.healthScore >= 70 ? "positive" : "warning" },
        { label: "SKUs tracked", value: `${products.length}`, tone: "neutral" },
        { label: "Need action", value: `${a.productsRequiringAction}`, tone: "critical" },
        { label: "Efficiency", value: `${a.efficiency}%`, tone: "neutral" },
      ],
      findings: o.findings.slice(0, 4),
      followUps: ["What should I do today?", "Where is money tied up?"],
    };
  }

  // Default: the flagship "What should I do today?" action plan.
  const top = o.findings.slice(0, 5);
  return {
    title: "Today's prioritised action plan",
    summary: `The orchestrator consulted ${AGENTS.length} agents across ${products.length} SKUs and resolved ${o.findings.length} findings into ${top.length} priority actions. ${top.filter((f) => f.priority === "CRITICAL").length} are critical and should be executed before end of day, protecting an estimated ${inr(top.reduce((s, f) => s + f.impactValue, 0), true)} of value.`,
    agents: ["health", "forecast", "reorder", "deadstock", "expiry", "analytics"],
    metrics: [
      { label: "Critical actions", value: `${o.findings.filter((f) => f.priority === "CRITICAL").length}`, tone: "critical" },
      { label: "Total findings", value: `${o.findings.length}`, tone: "neutral" },
      { label: "Value protected", value: inr(top.reduce((s, f) => s + f.impactValue, 0), true), tone: "positive" },
    ],
    findings: top,
    followUps: ["Which products are most likely to stock out?", "Show me dead stock.", "Where is money tied up?"],
  };
}