"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrencyFormatter } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import ProductManagementActions from '../product-management-actions';
import Pagination from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming you have a debounce hook

type ProductItem = {
  id: string;
  name: string;
  unique_reference: string;
  description: string | null;
  category_id: string | null;
  product_unit_abbreviation: string | null;
  purchase_price: number;
  sale_price: number;
  is_active: boolean;
  low_stock_threshold: number;
  image_url: string | null;
  categories: {
    id: string;
    name: string;
    unit_abbreviation: string | null;
  } | null;
};

type CategoryForProductForm = {
  id: string;
  name: string;
  unit_abbreviation: string | null;
};

interface ProductOverviewClientProps {
  initialProducts: ProductItem[];
  initialCategories: CategoryForProductForm[];
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export default function ProductOverviewClient({
  initialProducts,
  initialCategories,
  currentPage,
  itemsPerPage,
  totalItems,
}: ProductOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrency } = useCurrencyFormatter();

  // Get initial values from URL search params
  const initialQuery = searchParams.get('query') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialActiveStatus = searchParams.get('active') || 'all';

  // State for the search input
  const [productSearchQuery, setProductSearchQuery] = useState<string>(initialQuery);
  const debouncedSearchQuery = useDebounce(productSearchQuery, 300);

  // Function to update URL search parameters
  const updateSearchUrl = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 whenever a filter changes
    params.set('page', '1');
    router.push(`/dashboard/products?${params.toString()}`);
  }, [searchParams, router]);

  // Effect to apply the debounced search query filter
  useEffect(() => {
    // Only push to router if the debounced value is different from the initial URL param
    if (debouncedSearchQuery !== initialQuery) {
      updateSearchUrl('query', debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, initialQuery, updateSearchUrl]);

  // Handler to reset all filters
  const resetFilters = () => {
    setProductSearchQuery('');
    router.push('/dashboard/products');
  };

  // Handler for pagination
  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/dashboard/products?${params.toString()}`);
  }, [searchParams, router]);

  // Handler for items per page change
  const handleItemsPerPageChange = useCallback((newLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(newLimit));
    params.set('page', '1');
    router.push(`/dashboard/products?${params.toString()}`);
  }, [searchParams, router]);

  const handleProductSubmitted = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-end mb-6">
        <div className="flex-grow relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search products by name, reference..."
            className="pl-10 w-full"
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
          />
        </div>

        <Select onValueChange={(value) => updateSearchUrl('category', value)} value={initialCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {initialCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => updateSearchUrl('active', value)} value={initialActiveStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={resetFilters} className="self-end">Reset Filters</Button>
      </div>

      {/* Product Table */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>All Products</CardTitle>
            <CardDescription>Detailed list of all products in your inventory.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">SN</TableHead>
                <TableHead>Name/Reference</TableHead>
                <TableHead>Category/Unit</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialProducts && initialProducts.length > 0 ? (
                initialProducts.map((product, idx) => (
                  <TableRow key={product.id}>
                    <TableCell>{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                    <TableCell className="font-medium">{product.name} ({product.unique_reference})</TableCell>
                    <TableCell>{product.categories?.name || 'N/A'} ({product.product_unit_abbreviation || 'N/A'})</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                    <TableCell className="text-center">{product.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="flex justify-end">
                      <ProductManagementActions
                        productToEdit={product}
                        categories={initialCategories || []}
                        onProductSubmitted={handleProductSubmitted}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No products found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div> 
  );
}
 