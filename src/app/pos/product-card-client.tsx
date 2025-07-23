// src/app/pos/product-card-client.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // For conditional class names
import { useCurrencyFormatter } from '@/lib/formatters'; // For currency formatting
// Removed Image import as product images are not displayed

// Re-define ProductForPos type for clarity
type ProductForPos = {
  id: string;
  unique_reference: string;
  name: string;
  image_url: string | null;
  sale_price: number;
  low_stock_threshold: number;
  category_id: string | null;
};

// Re-define ProductStockDetail type for clarity
type ProductStockDetail = {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  warehouses: {
    id: string;
    name: string;
  } | null;
};

interface ProductCardClientProps {
  product: ProductForPos;
  productDetailedStock: Record<string, ProductStockDetail[]>;
  getStockStatusClass: (productId: string, threshold: number) => string;
  handleAddItemToCart: (product: ProductForPos) => void;
}

export default function ProductCardClient({
  product,
  productDetailedStock,
  getStockStatusClass,
  handleAddItemToCart,
}: ProductCardClientProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const totalAvailableStock = (productDetailedStock[product.id] || []).reduce((sum: number, s) => sum + s.quantity, 0);

  const handleClick = () => {
    if (totalAvailableStock === 0) {
      toast.error("Product is out of stock.");
    } else {
      handleAddItemToCart(product);
    }
  };

  return (
    <Card
      key={product.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        totalAvailableStock === 0 ? 'opacity-50 grayscale' : ''
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4 flex flex-col items-center text-center">
        {/* Image removed as requested */}
        <CardTitle className="text-base truncate w-full">{product.name}</CardTitle>
        <CardDescription className="text-sm text-gray-500">{product.unique_reference}</CardDescription>
        <p className="font-semibold text-lg mt-1">{formatCurrency(product.sale_price)}</p>
        {/* Display stock count per warehouse */}
        {productDetailedStock[product.id] && productDetailedStock[product.id].length > 0 ? (
          productDetailedStock[product.id].map(stockDetail => (
            <p key={stockDetail.warehouse_id} className={cn("text-sm", getStockStatusClass(stockDetail.product_id, product.low_stock_threshold))}>
              {stockDetail.warehouses?.name || 'Unknown Warehouse'}: {stockDetail.quantity}
            </p>
          ))
        ) : (
          <p className={cn("text-sm", getStockStatusClass(product.id, product.low_stock_threshold))}>
            No Stock Records
          </p>
        )}
      </CardContent>
    </Card>
  );
}