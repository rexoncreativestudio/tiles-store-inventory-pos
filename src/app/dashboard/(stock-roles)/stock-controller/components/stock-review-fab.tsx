"use client";
import React from "react";
import { Box } from "lucide-react";

export default function StockReviewFAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-4 bottom-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center gap-2 px-4 py-3 focus:outline-none transition-all"
      style={{ minWidth: 56, minHeight: 56 }}
      aria-label="View Stock Review"
    >
      <Box className="h-5 w-5" />
      <span className="font-semibold hidden sm:inline">Stock Review</span>
    </button>
  );
}