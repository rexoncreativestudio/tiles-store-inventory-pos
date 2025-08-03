"use client";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-10 w-10 animate-spin text-gray-600" />
      <span className="ml-4 text-lg text-gray-600">Loading...</span>
    </div>
  );
}