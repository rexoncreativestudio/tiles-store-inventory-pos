"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import React, { useState } from "react";

type BranchForSelect = { id: string; name: string };
type SalesFilterActionsProps = {
  branches: BranchForSelect[];
  searchParams?: Record<string, string>;
  className?: string;
};

export default function SalesFilterActions({
  branches,
  className,
}: SalesFilterActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to update a single param in the URL
  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === undefined || value === null) {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function resetFilters() {
    router.replace(pathname);
  }

  // For date selection, store as string for controlled component
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const branchId = searchParams.get("branchId") ?? "all";
  const saleType = searchParams.get("saleType") ?? "all";
  const search = searchParams.get("search") ?? "";

  // Search field state (controlled locally to avoid flicker)
  const [searchValue, setSearchValue] = useState(search);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("search", searchValue.trim());
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-4 items-end">
        {/* Branch */}
        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <Select
            value={branchId}
            onValueChange={(v) => updateParam("branchId", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Sale Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Sale Type</label>
          <Select
            value={saleType}
            onValueChange={(v) => updateParam("saleType", v)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* From Date (Shadcn Calendar) */}
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[140px] justify-start text-left font-normal"
              >
                {dateFrom
                  ? format(new Date(dateFrom), "dd/MM/yyyy")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom ? new Date(dateFrom) : undefined}
                onSelect={(date) => {
                  updateParam(
                    "dateFrom",
                    date ? date.toISOString().split("T")[0] : ""
                  );
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {/* To Date (Shadcn Calendar) */}
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[140px] justify-start text-left font-normal"
              >
                {dateTo
                  ? format(new Date(dateTo), "dd/MM/yyyy")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateTo ? new Date(dateTo) : undefined}
                onSelect={(date) => {
                  updateParam(
                    "dateTo",
                    date ? date.toISOString().split("T")[0] : ""
                  );
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {/* Search by Name or Reference */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1">
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            type="text"
            placeholder="Name or Reference"
            className="border rounded px-3 py-2 w-[180px]"
            value={searchValue}
            onChange={handleSearchInputChange}
            onBlur={() => updateParam("search", searchValue.trim())}
          />
        </form>
        {/* Reset */}
        <Button
          variant="default"
          onClick={resetFilters}
          className="mt-5 font-semibold"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
 