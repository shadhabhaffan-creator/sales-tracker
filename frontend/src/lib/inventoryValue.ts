/**
 * Inventory Valuation Helper
 *
 * Two cost calculation models:
 *  - PER_UNIT:    inventoryValue = stock × costPrice
 *  - TOTAL_BATCH: inventoryValue = costPrice  (the entered price IS the total batch cost)
 *
 * Default for bulk/raw units (LITER, KG, GRAM, KILOGRAM, ML):  TOTAL_BATCH
 * Default for countable units (UNIT, PIECE, BOTTLE, BOX, PACK, CARTON, OTHER): PER_UNIT
 */

const BULK_UNITS = new Set(['LITER', 'LITRE', 'KG', 'GRAM', 'KILOGRAM', 'ML', 'MILLILITER']);

/** Returns the correct default costCalculationType based on the product's unit */
export function defaultCostCalcType(unit: string | null | undefined): 'PER_UNIT' | 'TOTAL_BATCH' {
  if (!unit) return 'PER_UNIT';
  return BULK_UNITS.has(unit.toUpperCase()) ? 'TOTAL_BATCH' : 'PER_UNIT';
}

/** Computes the inventory value for a single product / variant row */
export function getInventoryValue(
  stock: number,
  costPrice: number,
  costCalculationType: string | null | undefined,
  unit: string | null | undefined
): number {
  const calcType = costCalculationType || defaultCostCalcType(unit);
  if (calcType === 'TOTAL_BATCH') {
    return costPrice || 0;
  }
  return (stock || 0) * (costPrice || 0);
}
