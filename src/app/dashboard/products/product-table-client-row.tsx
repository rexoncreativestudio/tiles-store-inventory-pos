// src/app/dashboard/products/product-table-client-row.tsx
"use client";

import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { useCurrencyFormatter } from '@/lib/formatters'; // CORRECTED: Absolute path
import ProductManagementActions from './product-management-actions';

// Re-define ProductWithDetails type for clarity in this component
type ProductWithDetails = {
    id: string;
    unique_reference: string;
    name: string;
    description: string | null;
    category_id: string | null;
    unit_id: string | null;
    purchase_price: number;
    sale_price: number;
    image_url: string | null;
    is_active: boolean;
    low_stock_threshold: number;
    created_at: string;
    updated_at: string;
    categories: { id: string; name: string } | null;
    units: { id: string; name: string; abbreviation: string | null } | null;
};

interface ProductTableClientRowProps {
    product: ProductWithDetails;
    idx: number;
    categories: Array<{ id: string; name: string }>;
    units: Array<{ id: string; name: string; abbreviation: string | null }>;
}

export default function ProductTableClientRow({ product, idx, categories, units }: ProductTableClientRowProps) {
    const { formatCurrency } = useCurrencyFormatter();

    return (
        <TableRow key={product.id}>
            <TableCell>{idx + 1}</TableCell>
            <TableCell className="font-medium">{product.unique_reference}</TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.categories?.name || 'N/A'}</TableCell>
            <TableCell>{product.units?.name || 'N/A'}</TableCell>
            <TableCell>{formatCurrency(product.purchase_price)}</TableCell>
            <TableCell>{formatCurrency(product.sale_price)}</TableCell>
            <TableCell>{product.is_active ? 'Yes' : 'No'}</TableCell>
            <TableCell>{product.low_stock_threshold}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                    <ProductManagementActions
                        productToEdit={product}
                        categories={categories || []}
                        units={units || []}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}