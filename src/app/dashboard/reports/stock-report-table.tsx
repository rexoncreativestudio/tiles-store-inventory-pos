// src/app/dashboard/reports/stock-report-table.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define types for data
type StockDataForReport = {
    product_id: string;
    quantity: number;
    warehouse_id: string;
    products: { id: string; name: string; unique_reference: string; category_id: string | null; low_stock_threshold: number; categories: { id: string; name: string } | null; } | null;
    warehouses: { id: string; name: string } | null;
};

type BranchForSelect = {
  id: string;
  name: string;
};

type CategoryForSelect = {
  id: string;
  name: string;
};

type ProductForSelect = {
  id: string;
  name: string;
  unique_reference: string;
};


interface StockReportTableProps {
    allStockData: StockDataForReport[];
    allBranches: BranchForSelect[];
    allCategories: CategoryForSelect[];
    allProducts: ProductForSelect[];
}

export default function StockReportTable({ allStockData, allBranches, allCategories, allProducts }: StockReportTableProps) {

    // Filter states
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<string>('all');
    const [productSearchQuery, setProductSearchQuery] = useState('');

    const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);


    // Filter stock data based on state
    const filteredStockData = useMemo(() => {
        let filtered = allStockData;

        if (selectedBranch !== 'all') {
            filtered = filtered.filter(item => item.warehouse_id === selectedBranch);
        }
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.products?.category_id === selectedCategory);
        }
        if (selectedProduct !== 'all') {
            filtered = filtered.filter(item => item.product_id === selectedProduct);
        }
        if (productSearchQuery) {
            const lowerCaseQuery = productSearchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                (item.products?.name || '').toLowerCase().includes(lowerCaseQuery) ||
                (item.products?.unique_reference || '').toLowerCase().includes(lowerCaseQuery)
            );
        }

        return filtered;
    }, [allStockData, selectedBranch, selectedCategory, selectedProduct, productSearchQuery]);

    // Removed unused uniqueWarehouses calculation
    // const uniqueWarehouses = useMemo(() => {
    //     const warehouses = new Set<string>();
    //     allStockData.forEach(item => {
    //         if (item.warehouses?.name) {
    //                 warehouses.add(item.warehouses.name);
    //         }
    //     });
    //     return Array.from(warehouses);
    // }, [allStockData]);


    const handleResetFilters = () => {
        setSelectedBranch('all');
        setSelectedCategory('all');
        setSelectedProduct('all');
        setProductSearchQuery('');
        setIsProductComboboxOpen(false);
    };

    const selectedProductDisplayName = allProducts.find(p => p.id === selectedProduct)?.name || "All Products";

    const getStockStatusClass = (quantity: number, productLowStockThreshold: number) => {
        if (quantity === 0) return 'text-red-500';
        if (quantity > 0 && quantity <= productLowStockThreshold) return 'text-yellow-600';
        return 'text-green-600';
    };


    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
                {/* Branch Filter */}
                <div className="grid gap-1">
                    <Label htmlFor="stock_branch_filter">Branch</Label>
                    <Select onValueChange={setSelectedBranch} value={selectedBranch}>
                        <SelectTrigger className="w-[180px]" id="stock_branch_filter">
                            <SelectValue placeholder="All Branches" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {allBranches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Category Filter */}
                <div className="grid gap-1">
                    <Label htmlFor="stock_category_filter">Category</Label>
                    <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                        <SelectTrigger className="w-[180px]" id="stock_category_filter">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {allCategories.map(category => (
                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Product Filter (Combobox) */}
                <div className="grid gap-1">
                    <Label htmlFor="stock_product_filter">Product</Label>
                    <Popover open={isProductComboboxOpen} onOpenChange={setIsProductComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isProductComboboxOpen}
                                className="w-[200px] justify-between"
                            >
                                {selectedProductDisplayName}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                                <CommandInput placeholder="Search product..." />
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all-products-option"
                                        onSelect={() => {
                                            setSelectedProduct('all');
                                            setIsProductComboboxOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", 'all' === selectedProduct ? "opacity-100" : "opacity-0")}/>
                                        All Products
                                    </CommandItem>
                                    {allProducts.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={`${product.name} (${product.unique_reference})`}
                                            onSelect={() => {
                                                setSelectedProduct(product.id);
                                                setIsProductComboboxOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", product.id === selectedProduct ? "opacity-100" : "opacity-0")}/>
                                            {product.name} ({product.unique_reference})
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={handleResetFilters} variant="outline" className="self-end">Reset Filters</Button>
            </div>

            {/* Stock Data Table */}
            <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[5%]">SN</TableHead>
                            <TableHead className="w-[20%]">Product Ref.</TableHead>
                            <TableHead className="w-[25%]">Product Name</TableHead>
                            <TableHead className="w-[15%]">Category</TableHead>
                            <TableHead className="w-[15%]">Warehouse</TableHead>
                            <TableHead className="w-[10%] text-right">Quantity</TableHead>
                            <TableHead className="w-[10%]">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStockData.length > 0 ? (
                            filteredStockData.map((item, idx) => (
                                <TableRow key={item.product_id + item.warehouse_id} className={item.quantity <= (item.products?.low_stock_threshold || 0) && item.quantity > 0 ? 'bg-yellow-50' : item.quantity === 0 ? 'bg-red-50' : ''}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell className="font-medium">{item.products?.unique_reference || 'N/A'}</TableCell>
                                    <TableCell>{item.products?.name || 'N/A'}</TableCell>
                                    <TableCell>{item.products?.categories?.name || 'N/A'}</TableCell>
                                    <TableCell>{item.warehouses?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell><span className={getStockStatusClass(item.quantity, item.products?.low_stock_threshold || 0)}>
                                        {item.quantity === 0 && 'Out of Stock'}
                                        {item.quantity > 0 && item.quantity <= (item.products?.low_stock_threshold || 0) && 'Low Stock'}
                                        {item.quantity > (item.products?.low_stock_threshold || 0) && 'In Stock'}
                                    </span></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No stock records found matching your criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}