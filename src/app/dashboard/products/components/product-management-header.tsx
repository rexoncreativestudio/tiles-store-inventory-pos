"use client";

import React from "react";

export default function ProductManagementHeader() {
  return (
    <div className="mb-6">
      {/* Responsive flex container */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 w-full">
        <h1 className="text-3xl font-bold">Product Management</h1>
      </div>
    </div>
  );
}   