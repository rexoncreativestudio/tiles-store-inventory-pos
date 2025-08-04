"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Type Definitions (aligned with page.tsx fetches) ---
type ProductForStock = {
  id: string;
  name: string;
  unique_reference: string;
  low_stock_threshold: number;
  product_unit_abbreviation: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
};

type ProductStockDetail = {
  product_id: string;
  quantity: number;
  warehouse_id: string;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

type CategoryForFilter = {
  id: string;
  name: string;
};

type WarehouseForFilter = {
  id: string;
  name: string;
};

// --- Add initialCategories prop to the props interface ---
interface StockOverviewClientProps {
  initialProducts: ProductForStock[];
  initialStockDetails: ProductStockDetail[];
  initialCategories: CategoryForFilter[];      // <-- Added!
  initialWarehouses: WarehouseForFilter[];
}

export default function StockOverviewClient({
  initialProducts,
  initialStockDetails,
  initialWarehouses
}: StockOverviewClientProps) {
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('all');

  // Map: productId -> array of stock details for that product
  const stockMap = useMemo(() => {
    const map: Record<string, ProductStockDetail[]> = {};
    initialStockDetails.forEach(s => {
      if (!map[s.product_id]) {
        map[s.product_id] = [];
      }
      map[s.product_id].push(s);
    });
    return map;
  }, [initialStockDetails]);

  const filteredAndSearchedProducts = useMemo(() => {
    let productsToDisplay = initialProducts;

    if (selectedWarehouseFilter && selectedWarehouseFilter !== 'all') {
      productsToDisplay = productsToDisplay.filter(p =>
        stockMap[p.id]?.some(sd => sd.warehouse_id === selectedWarehouseFilter && sd.quantity > 0)
      );
    }

    if (productSearchQuery) {
      const lowerCaseQuery = productSearchQuery.toLowerCase();
      productsToDisplay = productsToDisplay.filter(p =>
        p.name.toLowerCase().includes(lowerCaseQuery) ||
        p.unique_reference.toLowerCase().includes(lowerCaseQuery)
      );
    }

    return productsToDisplay;
  }, [initialProducts, selectedWarehouseFilter, productSearchQuery, stockMap]);

  const getStockStatusClass = (productId: string, threshold: number) => {
    const totalStock = (stockMap[productId] || []).reduce((sum: number, s) => sum + s.quantity, 0);
    if (totalStock === 0) return 'text-red-500';
    if (totalStock <= threshold) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getTotalProductStock = (productId: string) => {
    return (stockMap[productId] || []).reduce((sum: number, s) => sum + s.quantity, 0);
  };

  // Print warehouses vertically, each on its own line
  const getWarehouseStockDisplay = (productId: string) => {
    const stocks = stockMap[productId] || [];
    if (!stocks.length) return "N/A";
    return (
      <div>
        {stocks
          .filter(sd => sd.quantity > 0)
          .map((sd, i) => (
            <div key={i}>
              {(sd.warehouses?.name || 'Unknown Warehouse')}: {sd.quantity}
            </div>
          ))}
      </div>
    );
  };

  useEffect(() => {
    // (Optional: add side effects if needed)
  }, [productSearchQuery, selectedWarehouseFilter]);

  return (
    <div className="space-y-6">
      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-grow relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search products by name or reference..."
            className="pl-10 w-full"
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
          />
        </div>

        <Select onValueChange={setSelectedWarehouseFilter} value={selectedWarehouseFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {initialWarehouses.map(warehouse => (
              <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stock Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock Levels</CardTitle>
          <CardDescription>Overview of product quantities across all warehouses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]">SN</TableHead>
                <TableHead className="w-[30%]">Product/Reference</TableHead>
                <TableHead className="w-[25%]">Warehouse</TableHead>
                <TableHead className="w-[10%] text-center">Unit</TableHead>
                <TableHead className="w-[10%] text-center">Total Stock</TableHead>
                <TableHead className="w-[10%] text-center">Threshold</TableHead>
                <TableHead className="w-[10%] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSearchedProducts.length > 0 ? (
                filteredAndSearchedProducts.map((product, idx) => {
                  const totalStock = getTotalProductStock(product.id);
                  const stockStatusClass = getStockStatusClass(product.id, product.low_stock_threshold);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {product.name} ({product.unique_reference})
                      </TableCell>
                      <TableCell>{getWarehouseStockDisplay(product.id)}</TableCell>
                      <TableCell className="text-center">{product.product_unit_abbreviation || 'N/A'}</TableCell>
                      <TableCell className={cn("text-center font-semibold", stockStatusClass)}>{totalStock}</TableCell>
                      <TableCell className="text-center">{product.low_stock_threshold}</TableCell>
                      <TableCell className={cn("text-center font-bold", stockStatusClass)}>
                        {totalStock === 0 ? 'Out of Stock' : (totalStock <= product.low_stock_threshold ? 'Low Stock' : 'In Stock')}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No products found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 