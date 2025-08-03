"use client";

import React from "react";
import ProductManagementActions from "../product-management-actions";
import { CategoryForProductForm } from "../types";
import { useRouter } from "next/navigation";

interface Props {
  categories: CategoryForProductForm[];
}

export default function ProductManagementHeader({ categories }: Props) {
  const router = useRouter();

  // Client-side callback to refresh data after add/edit/delete
  function handleProductSubmitted() {
    router.refresh();
  }

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Product Management</h1>
      <ProductManagementActions
        categories={categories}
        onProductSubmitted={handleProductSubmitted}
      />
    </div>
  );
}