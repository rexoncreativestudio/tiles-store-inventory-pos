"use client";

import React, { useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import ProductManagementActions from "../product-management-actions";
import Image from "next/image";

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

interface ProductMobileAccordionClientProps {
  products: ProductItem[];
  categories: CategoryForProductForm[];
  currentPage: number;
  itemsPerPage: number;
  onProductSubmitted: () => void;
}

export default function ProductMobileAccordionClient({
  products,
  categories,
  
  onProductSubmitted,
}: ProductMobileAccordionClientProps) {
  const [expanded, setExpanded] = useState<string | undefined>(undefined);

  return (
    <div className="w-full max-w-full px-0">
      <Accordion
        type="single"
        collapsible
        value={expanded}
        onValueChange={setExpanded}
        className="w-full max-w-full"
      >
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow px-3 py-6 text-center text-gray-500 w-full max-w-full">
            No products found matching your criteria.
          </div>
        ) : (
          products.map((product) => (
            <AccordionItem
              key={product.id}
              value={product.id}
              className="rounded-lg shadow mb-3 bg-white border w-full max-w-full"
            >
              <AccordionTrigger className="p-4 flex flex-col items-start w-full gap-2">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="font-bold text-base text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.unique_reference}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-blue-600">
                      {product.sale_price}
                    </span>
                    <span className={product.is_active ? "text-green-600 text-xs font-semibold" : "text-red-600 text-xs font-semibold"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400 w-full">
                  <span>Category: {product.categories?.name || "N/A"}</span>
                  <span>Unit: {product.product_unit_abbreviation || "N/A"}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 px-4 pb-4 w-full max-w-full">
                {product.image_url &&
                  <div className="mb-2">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      width={140}
                      height={90}
                      className="rounded shadow object-cover w-full max-h-32"
                    />
                  </div>
                }
                <div className="grid grid-cols-1 gap-1 text-sm mb-2">
                  <div>
                    <span className="font-medium">Description:</span> {product.description || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Low Stock Threshold:</span> {product.low_stock_threshold}
                  </div>
                  <div>
                    <span className="font-medium">Purchase Price:</span> {product.purchase_price}
                  </div>
                  <div>
                    <span className="font-medium">Sale Price:</span> {product.sale_price}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 justify-end">
                  <ProductManagementActions
                    productToEdit={product}
                    categories={categories}
                    onProductSubmitted={onProductSubmitted}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>
      <style jsx global>{`
        .AccordionItem,
        .AccordionContent,
        .AccordionTrigger {
          width: 100%;
          max-width: 100%;
        }
      `}</style>
    </div>
  );
}