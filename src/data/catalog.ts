// Deterministic demo dataset for StockPilot AI.
// No randomness at runtime: all "variation" comes from a seeded hash so that
// every render, every reload and every demo produces identical numbers.

export type Category =
  | "Beverages"
  | "Dairy"
  | "Snacks"
  | "Groceries"
  | "Personal Care"
  | "Household";

export interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
  reliability: number; // 0-100
  avgDeliveryDays: number;
}

export const SUPPLIERS: Supplier[] = [
  { id: "SUP-01", name: "Aarav Dairy Foods", leadTimeDays: 2, reliability: 94, avgDeliveryDays: 2.3 },
  { id: "SUP-02", name: "Nandini Beverages Co.", leadTimeDays: 4, reliability: 88, avgDeliveryDays: 4.6 },
  { id: "SUP-03", name: "Shakti Grocers Wholesale", leadTimeDays: 6, reliability: 91, avgDeliveryDays: 6.4 },
  { id: "SUP-04", name: "Zenith Personal Care", leadTimeDays: 8, reliability: 79, avgDeliveryDays: 9.5 },
  { id: "SUP-05", name: "Metro Household Supply", leadTimeDays: 5, reliability: 85, avgDeliveryDays: 5.8 },
  { id: "SUP-06", name: "Crunch Snacks Distributors", leadTimeDays: 3, reliability: 92, avgDeliveryDays: 3.2 },
];

export interface ProductSeed {
  sku: string;
  name: string;
  category: Category;
  stock: number;
  baseDaily: number; // baseline units/day 30 days ago
  trend: number; // demand multiplier applied linearly across the 30d window
  cost: number; // ₹ per unit
  price: number; // ₹ per unit
  reorderPoint: number;
  supplierId: string;
  expiryInDays: number | null; // days from today
  lastMovementDaysAgo: number;
}

// prettier-ignore
export const PRODUCT_SEEDS: ProductSeed[] = [
  // ---- Dairy (short shelf life, fast movers) ----
  { sku: "DRY-1001", name: "Fresh Milk 1L", category: "Dairy", stock: 42, baseDaily: 16, trend: 1.18, cost: 48, price: 62, reorderPoint: 90, supplierId: "SUP-01", expiryInDays: 4, lastMovementDaysAgo: 0 },
  { sku: "DRY-1002", name: "Toned Milk 500ml", category: "Dairy", stock: 128, baseDaily: 21, trend: 1.05, cost: 24, price: 32, reorderPoint: 110, supplierId: "SUP-01", expiryInDays: 6, lastMovementDaysAgo: 0 },
  { sku: "DRY-1003", name: "Greek Yogurt 400g", category: "Dairy", stock: 64, baseDaily: 7.5, trend: 1.32, cost: 82, price: 125, reorderPoint: 55, supplierId: "SUP-01", expiryInDays: 12, lastMovementDaysAgo: 0 },
  { sku: "DRY-1004", name: "Amul Butter 500g", category: "Dairy", stock: 210, baseDaily: 6, trend: 0.98, cost: 245, price: 295, reorderPoint: 60, supplierId: "SUP-01", expiryInDays: 88, lastMovementDaysAgo: 1 },
  { sku: "DRY-1005", name: "Paneer Fresh 200g", category: "Dairy", stock: 26, baseDaily: 9, trend: 1.12, cost: 78, price: 105, reorderPoint: 45, supplierId: "SUP-01", expiryInDays: 3, lastMovementDaysAgo: 0 },
  { sku: "DRY-1006", name: "Cheese Slices 200g", category: "Dairy", stock: 340, baseDaily: 3.2, trend: 0.82, cost: 118, price: 155, reorderPoint: 40, supplierId: "SUP-01", expiryInDays: 26, lastMovementDaysAgo: 9 },
  { sku: "DRY-1007", name: "Fresh Curd 1kg", category: "Dairy", stock: 88, baseDaily: 12, trend: 1.02, cost: 62, price: 84, reorderPoint: 70, supplierId: "SUP-01", expiryInDays: 5, lastMovementDaysAgo: 0 },

  // ---- Beverages ----
  { sku: "BEV-2001", name: "Cold Brew Coffee 250ml", category: "Beverages", stock: 54, baseDaily: 11, trend: 1.45, cost: 68, price: 110, reorderPoint: 120, supplierId: "SUP-02", expiryInDays: 140, lastMovementDaysAgo: 0 },
  { sku: "BEV-2002", name: "Sparkling Water 750ml", category: "Beverages", stock: 620, baseDaily: 4.4, trend: 0.74, cost: 42, price: 65, reorderPoint: 80, supplierId: "SUP-02", expiryInDays: 220, lastMovementDaysAgo: 12 },
  { sku: "BEV-2003", name: "Orange Juice 1L", category: "Beverages", stock: 96, baseDaily: 8.5, trend: 1.08, cost: 88, price: 129, reorderPoint: 75, supplierId: "SUP-02", expiryInDays: 18, lastMovementDaysAgo: 0 },
  { sku: "BEV-2004", name: "Green Tea Pack 25s", category: "Beverages", stock: 410, baseDaily: 2.1, trend: 0.88, cost: 145, price: 210, reorderPoint: 45, supplierId: "SUP-02", expiryInDays: 310, lastMovementDaysAgo: 21 },
  { sku: "BEV-2005", name: "Energy Drink 300ml", category: "Beverages", stock: 148, baseDaily: 14, trend: 1.26, cost: 55, price: 95, reorderPoint: 160, supplierId: "SUP-02", expiryInDays: 95, lastMovementDaysAgo: 0 },
  { sku: "BEV-2006", name: "Mango Nectar 200ml", category: "Beverages", stock: 780, baseDaily: 3.0, trend: 0.62, cost: 18, price: 30, reorderPoint: 90, supplierId: "SUP-02", expiryInDays: 34, lastMovementDaysAgo: 16 },
  { sku: "BEV-2007", name: "Filter Coffee Powder 500g", category: "Beverages", stock: 132, baseDaily: 5.2, trend: 1.04, cost: 210, price: 289, reorderPoint: 55, supplierId: "SUP-02", expiryInDays: 165, lastMovementDaysAgo: 1 },
  { sku: "BEV-2008", name: "Coconut Water 300ml", category: "Beverages", stock: 38, baseDaily: 10.5, trend: 1.35, cost: 32, price: 55, reorderPoint: 90, supplierId: "SUP-02", expiryInDays: 22, lastMovementDaysAgo: 0 },

  // ---- Snacks ----
  { sku: "SNK-3001", name: "Salted Potato Chips 90g", category: "Snacks", stock: 240, baseDaily: 18, trend: 1.06, cost: 22, price: 35, reorderPoint: 200, supplierId: "SUP-06", expiryInDays: 42, lastMovementDaysAgo: 0 },
  { sku: "SNK-3002", name: "Roasted Almonds 250g", category: "Snacks", stock: 74, baseDaily: 4.6, trend: 1.22, cost: 265, price: 359, reorderPoint: 50, supplierId: "SUP-06", expiryInDays: 74, lastMovementDaysAgo: 0 },
  { sku: "SNK-3003", name: "Choco Cream Biscuits", category: "Snacks", stock: 512, baseDaily: 9.8, trend: 0.91, cost: 28, price: 45, reorderPoint: 120, supplierId: "SUP-06", expiryInDays: 29, lastMovementDaysAgo: 2 },
  { sku: "SNK-3004", name: "Protein Bar 60g", category: "Snacks", stock: 44, baseDaily: 6.8, trend: 1.52, cost: 95, price: 149, reorderPoint: 70, supplierId: "SUP-06", expiryInDays: 58, lastMovementDaysAgo: 0 },
  { sku: "SNK-3005", name: "Masala Namkeen 400g", category: "Snacks", stock: 186, baseDaily: 7.2, trend: 0.97, cost: 68, price: 99, reorderPoint: 80, supplierId: "SUP-06", expiryInDays: 51, lastMovementDaysAgo: 1 },
  { sku: "SNK-3006", name: "Gourmet Popcorn 150g", category: "Snacks", stock: 396, baseDaily: 1.6, trend: 0.58, cost: 74, price: 119, reorderPoint: 40, supplierId: "SUP-06", expiryInDays: 47, lastMovementDaysAgo: 34 },
  { sku: "SNK-3007", name: "Dark Chocolate 90g", category: "Snacks", stock: 158, baseDaily: 5.4, trend: 1.14, cost: 118, price: 175, reorderPoint: 60, supplierId: "SUP-06", expiryInDays: 67, lastMovementDaysAgo: 0 },

  // ---- Groceries ----
  { sku: "GRC-4001", name: "Basmati Rice 5kg", category: "Groceries", stock: 92, baseDaily: 3.4, trend: 1.02, cost: 520, price: 689, reorderPoint: 40, supplierId: "SUP-03", expiryInDays: 400, lastMovementDaysAgo: 0 },
  { sku: "GRC-4002", name: "Toor Dal 1kg", category: "Groceries", stock: 58, baseDaily: 8.2, trend: 1.16, cost: 148, price: 189, reorderPoint: 95, supplierId: "SUP-03", expiryInDays: 210, lastMovementDaysAgo: 0 },
  { sku: "GRC-4003", name: "Sunflower Oil 1L", category: "Groceries", stock: 118, baseDaily: 9.6, trend: 1.09, cost: 132, price: 168, reorderPoint: 130, supplierId: "SUP-03", expiryInDays: 155, lastMovementDaysAgo: 0 },
  { sku: "GRC-4004", name: "Whole Wheat Atta 10kg", category: "Groceries", stock: 36, baseDaily: 4.1, trend: 1.28, cost: 385, price: 459, reorderPoint: 45, supplierId: "SUP-03", expiryInDays: 96, lastMovementDaysAgo: 0 },
  { sku: "GRC-4005", name: "Organic Quinoa 500g", category: "Groceries", stock: 268, baseDaily: 0.9, trend: 0.55, cost: 330, price: 449, reorderPoint: 25, supplierId: "SUP-03", expiryInDays: 190, lastMovementDaysAgo: 41 },
  { sku: "GRC-4006", name: "Iodised Salt 1kg", category: "Groceries", stock: 480, baseDaily: 6.4, trend: 1.0, cost: 18, price: 28, reorderPoint: 90, supplierId: "SUP-03", expiryInDays: 500, lastMovementDaysAgo: 1 },
  { sku: "GRC-4007", name: "Turmeric Powder 200g", category: "Groceries", stock: 144, baseDaily: 3.8, trend: 1.03, cost: 62, price: 89, reorderPoint: 55, supplierId: "SUP-03", expiryInDays: 240, lastMovementDaysAgo: 2 },
  { sku: "GRC-4008", name: "Brown Sugar 1kg", category: "Groceries", stock: 322, baseDaily: 1.4, trend: 0.68, cost: 74, price: 105, reorderPoint: 35, supplierId: "SUP-03", expiryInDays: 300, lastMovementDaysAgo: 27 },
  { sku: "GRC-4009", name: "Instant Noodles 6-pack", category: "Groceries", stock: 210, baseDaily: 13.5, trend: 1.11, cost: 96, price: 138, reorderPoint: 180, supplierId: "SUP-03", expiryInDays: 63, lastMovementDaysAgo: 0 },
  { sku: "GRC-4010", name: "Honey 500g", category: "Groceries", stock: 88, baseDaily: 2.6, trend: 0.94, cost: 210, price: 299, reorderPoint: 35, supplierId: "SUP-03", expiryInDays: 380, lastMovementDaysAgo: 3 },

  // ---- Personal Care ----
  { sku: "PRC-5001", name: "Herbal Shampoo 340ml", category: "Personal Care", stock: 64, baseDaily: 5.1, trend: 1.19, cost: 185, price: 265, reorderPoint: 80, supplierId: "SUP-04", expiryInDays: 420, lastMovementDaysAgo: 0 },
  { sku: "PRC-5002", name: "Aloe Face Wash 150ml", category: "Personal Care", stock: 152, baseDaily: 4.2, trend: 1.06, cost: 128, price: 199, reorderPoint: 60, supplierId: "SUP-04", expiryInDays: 210, lastMovementDaysAgo: 1 },
  { sku: "PRC-5003", name: "Sunscreen SPF50 80g", category: "Personal Care", stock: 288, baseDaily: 1.2, trend: 0.6, cost: 310, price: 449, reorderPoint: 30, supplierId: "SUP-04", expiryInDays: 55, lastMovementDaysAgo: 38 },
  { sku: "PRC-5004", name: "Toothpaste 200g", category: "Personal Care", stock: 96, baseDaily: 7.4, trend: 1.07, cost: 82, price: 118, reorderPoint: 110, supplierId: "SUP-04", expiryInDays: 300, lastMovementDaysAgo: 0 },
  { sku: "PRC-5005", name: "Body Lotion 400ml", category: "Personal Care", stock: 176, baseDaily: 2.8, trend: 0.86, cost: 215, price: 315, reorderPoint: 45, supplierId: "SUP-04", expiryInDays: 130, lastMovementDaysAgo: 6 },
  { sku: "PRC-5006", name: "Handmade Soap 100g", category: "Personal Care", stock: 604, baseDaily: 2.2, trend: 0.64, cost: 45, price: 79, reorderPoint: 70, supplierId: "SUP-04", expiryInDays: 340, lastMovementDaysAgo: 29 },
  { sku: "PRC-5007", name: "Hair Serum 100ml", category: "Personal Care", stock: 34, baseDaily: 3.6, trend: 1.38, cost: 240, price: 379, reorderPoint: 45, supplierId: "SUP-04", expiryInDays: 260, lastMovementDaysAgo: 0 },

  // ---- Household ----
  { sku: "HSH-6001", name: "Dishwash Gel 750ml", category: "Household", stock: 132, baseDaily: 6.2, trend: 1.05, cost: 118, price: 165, reorderPoint: 95, supplierId: "SUP-05", expiryInDays: 460, lastMovementDaysAgo: 0 },
  { sku: "HSH-6002", name: "Floor Cleaner 1L", category: "Household", stock: 78, baseDaily: 5.8, trend: 1.21, cost: 142, price: 199, reorderPoint: 90, supplierId: "SUP-05", expiryInDays: 380, lastMovementDaysAgo: 0 },
  { sku: "HSH-6003", name: "Garbage Bags 30s", category: "Household", stock: 264, baseDaily: 8.4, trend: 1.01, cost: 88, price: 129, reorderPoint: 120, supplierId: "SUP-05", expiryInDays: 900, lastMovementDaysAgo: 0 },
  { sku: "HSH-6004", name: "Detergent Powder 4kg", category: "Household", stock: 46, baseDaily: 4.9, trend: 1.24, cost: 395, price: 519, reorderPoint: 60, supplierId: "SUP-05", expiryInDays: 520, lastMovementDaysAgo: 0 },
  { sku: "HSH-6005", name: "Scented Candle Set", category: "Household", stock: 342, baseDaily: 0.7, trend: 0.5, cost: 240, price: 399, reorderPoint: 25, supplierId: "SUP-05", expiryInDays: null, lastMovementDaysAgo: 52 },
  { sku: "HSH-6006", name: "Microfiber Cloth 3s", category: "Household", stock: 418, baseDaily: 1.8, trend: 0.72, cost: 65, price: 119, reorderPoint: 45, supplierId: "SUP-05", expiryInDays: null, lastMovementDaysAgo: 24 },
  { sku: "HSH-6007", name: "Mosquito Repellent Refill", category: "Household", stock: 58, baseDaily: 7.8, trend: 1.34, cost: 72, price: 109, reorderPoint: 110, supplierId: "SUP-05", expiryInDays: 175, lastMovementDaysAgo: 0 },
  { sku: "HSH-6008", name: "Air Freshener 250ml", category: "Household", stock: 196, baseDaily: 3.1, trend: 0.9, cost: 132, price: 189, reorderPoint: 50, supplierId: "SUP-05", expiryInDays: 148, lastMovementDaysAgo: 4 },
];

export const CATEGORIES: Category[] = [
  "Beverages",
  "Dairy",
  "Snacks",
  "Groceries",
  "Personal Care",
  "Household",
];