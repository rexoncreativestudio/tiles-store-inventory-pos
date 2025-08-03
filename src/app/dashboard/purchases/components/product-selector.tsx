import React, { useState } from "react";

interface Product {
  id: string;
  name: string;
  unique_reference: string;
  product_unit_abbreviation?: string | null;
}

interface ProductSelectorProps {
  products: Product[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ProductSelector({
  products,
  value,
  onChange,
  disabled = false,
  className = "",
}: ProductSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.unique_reference.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder="Search product..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
        className="mb-2 w-full px-2 py-1 border rounded"
        aria-label="Search product"
      />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2 py-1 border rounded"
        aria-label="Select product"
      >
        <option value="">Select Product</option>
        {filteredProducts.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} ({product.unique_reference})
          </option>
        ))}
      </select>
    </div>
  );
}