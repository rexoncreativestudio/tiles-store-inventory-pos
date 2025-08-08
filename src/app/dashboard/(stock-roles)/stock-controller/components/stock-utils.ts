import { StockReviewRow } from "../types";

type RawStockRow = {
  product_id: string;
  product_name: string;
  product_ref: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
};

export function groupStockByProduct(rawRows: RawStockRow[]): StockReviewRow[] {
  const map = new Map<string, StockReviewRow>();

  for (const row of rawRows) {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, {
        product_id: row.product_id,
        product_name: row.product_name,
        product_ref: row.product_ref,
        warehouses: [],
        total_stock: 0,
      });
    }
    const entry = map.get(row.product_id)!;
    entry.warehouses.push({
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,
      quantity: Number(row.quantity),
    });
    entry.total_stock += Number(row.quantity);
  }

  return Array.from(map.values());
}