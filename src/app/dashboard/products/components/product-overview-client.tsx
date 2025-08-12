"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrencyFormatter } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProductManagementActions from "../product-management-actions";
import Pagination from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/use-debounce";
import ProductMobileAccordionClient from "./product-mobile-accordion-client";

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
  isFiltered: boolean;
}

export default function ProductOverviewClient({
  initialProducts,
  initialCategories,
  currentPage,
  itemsPerPage,
  totalItems,
  isFiltered,
}: ProductOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrency } = useCurrencyFormatter();

  const initialQuery = searchParams.get("query") || "";
  const initialCategory = searchParams.get("category") || "all";
  const initialActiveStatus = searchParams.get("active") || "all";

  const [productSearchQuery, setProductSearchQuery] =
    useState<string>(initialQuery);
  const debouncedSearchQuery = useDebounce(productSearchQuery, 300);

  const updateSearchUrl = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`/dashboard/products?${params.toString()}`);
    },
    [searchParams, router]
  );

  useEffect(() => {
    if (debouncedSearchQuery !== initialQuery) {
      updateSearchUrl("query", debouncedSearchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]);

  const resetFilters = () => {
    setProductSearchQuery("");
    router.push("/dashboard/products");
  };

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`/dashboard/products?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleItemsPerPageChange = useCallback(
    (newLimit: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("limit", String(newLimit));
      params.set("page", "1");
      router.push(`/dashboard/products?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleProductSubmitted = () => {
    router.refresh();
  };

  const productsToDisplay = useMemo(() => {
    if (isFiltered) return initialProducts;
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return initialProducts.slice(startIdx, endIdx);
  }, [initialProducts, isFiltered, currentPage, itemsPerPage]);

  // Responsive: mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-100 via-white to-gray-200 p-2 sm:p-8">
      {/* --- Filter Section --- */}
      <section
        className="bg-white rounded-xl shadow-md mb-8 px-2 sm:px-6 py-6 sm:py-8 w-full"
        style={{
          boxShadow:
            "0 2px 16px 0 rgba(47, 60, 100, 0.08), 0 1.5px 3px 0 rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 flex-wrap items-end sm:items-center w-full">
          <div className="flex-grow relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="🔍 Search products by name, reference..."
              className="pl-10 py-3 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all w-full text-base bg-gray-50"
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <Select
            onValueChange={(value) => updateSearchUrl("category", value)}
            value={initialCategory}
          >
            <SelectTrigger className="w-full sm:w-[170px] rounded-lg border-gray-200 bg-gray-50 py-2 text-base">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {initialCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => updateSearchUrl("active", value)}
            value={initialActiveStatus}
          >
            <SelectTrigger className="w-full sm:w-[150px] rounded-lg border-gray-200 bg-gray-50 py-2 text-base">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="self-end rounded-lg border-gray-300 text-gray-700 hover:text-blue-600 transition-all w-full sm:w-auto"
          >
            Reset Filters
          </Button>
        </div>
      </section>

      {/* --- Product List Section --- */}
      <section className="bg-white rounded-xl shadow-lg p-0 sm:p-8 w-full">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 gap-2 w-full">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-1">
              All Products
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Your inventory, always in style.
            </CardDescription>
          </div>
          {/* Desktop: Add Product button here */}
          {!isMobile && (
            <div>
              <ProductManagementActions
                categories={initialCategories}
                onProductSubmitted={handleProductSubmitted}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0 w-full">
          {isMobile ? (
            <>
              {/* Mobile: Add Product button above accordion */}
              <div className="mb-2 w-full">
                <ProductManagementActions
                  categories={initialCategories}
                  onProductSubmitted={handleProductSubmitted}
                />
              </div>
              <ProductMobileAccordionClient
                products={productsToDisplay}
                categories={initialCategories}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onProductSubmitted={handleProductSubmitted}
              />
            </>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="w-full rounded-md overflow-hidden">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[5%]">SN</TableHead>
                    <TableHead className="w-[20%]">Name/Reference</TableHead>
                    <TableHead className="w-[20%]">Category/Unit</TableHead>
                    <TableHead className="w-[12%] text-right">
                      Sale Price
                    </TableHead>
                    <TableHead className="w-[10%] text-center">Active</TableHead>
                    <TableHead className="w-[13%] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsToDisplay && productsToDisplay.length > 0 ? (
                    productsToDisplay.map((product, idx) => (
                      <TableRow
                        key={`product-row-${product.id}-${idx}`}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <TableCell>
                          {isFiltered
                            ? idx + 1
                            : (currentPage - 1) * itemsPerPage + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="block text-base">{product.name}</span>
                          <span className="text-xs text-gray-500">
                            ({product.unique_reference})
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block">
                            {product.categories?.name || "N/A"}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({product.product_unit_abbreviation || "N/A"})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-lg">
                          {formatCurrency(product.sale_price)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              product.is_active
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {product.is_active ? "Yes" : "No"}
                          </span>
                        </TableCell>
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
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-gray-500"
                      >
                        No products found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </section>

      {/* --- Pagination --- */}
      {!isFiltered && (
        <div className="mt-8 w-full">
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}
    </div>
  );
}  