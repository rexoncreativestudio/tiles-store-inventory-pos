"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import React, { useState, useTransition } from "react";

// Helper functions for default dates
function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function getLastDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

type BranchForSelect = { id: string; name: string };
type SalesFilterActionsProps = {
  branches: BranchForSelect[];
  searchParams?: Record<string, string>;
  className?: string;
};

const SALE_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "held", label: "Held" },
  { value: "cancelled", label: "Cancelled" },
  { value: "pending_approval", label: "Pending Approval" }
];

export default function SalesFilterActions({
  branches,
  className,
}: SalesFilterActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Today's date for defaulting
  const today = new Date();
  const firstDay = getFirstDayOfMonth(today);
  const lastDay = getLastDayOfMonth(today);

  // For date selection, store as string for controlled component
  // If no dateFrom/dateTo in searchParams, use default for current month
  const dateFrom = searchParams.get("dateFrom") || format(firstDay, "yyyy-MM-dd");
  const dateTo = searchParams.get("dateTo") || format(lastDay, "yyyy-MM-dd");
  const branchId = searchParams.get("branchId") ?? "all";
  const saleType = searchParams.get("saleType") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";

  // Helper to update a single param in the URL (uses startTransition for swift UX)
  function updateParam(name: string, value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === undefined || value === null) {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      // If setting dateFrom/dateTo and none existed before, always set both to default so filters are stable
      if ((name === "dateFrom" || name === "dateTo") && !searchParams.get("dateFrom") && !searchParams.get("dateTo")) {
        params.set("dateFrom", format(firstDay, "yyyy-MM-dd"));
        params.set("dateTo", format(lastDay, "yyyy-MM-dd"));
      }
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function resetFilters() {
    startTransition(() => router.replace(pathname));
  }

  // Search field state (controlled locally to avoid flicker)
  const [searchValue, setSearchValue] = useState(search);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    // Swift filter: update while typing (debounced in parent fetch)
    updateParam("search", e.target.value.trim());
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("search", searchValue.trim());
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          // Mobile: vertical stack, Desktop: row with wrap
          "flex flex-col gap-4 w-full",
          "sm:flex-row sm:flex-wrap sm:items-end"
        )}
      >
        {/* Branch */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1">Branch</label>
          <Select
            value={branchId}
            onValueChange={(v) => updateParam("branchId", v)}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[150px]">
              <SelectValue placeholder="Select branch" />
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
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1">Sale Type</label>
          <Select
            value={saleType}
            onValueChange={(v) => updateParam("saleType", v)}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[130px]">
              <SelectValue placeholder="Sale Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="external">External</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Sale Status */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1">Status</label>
          <Select
            value={status}
            onValueChange={(v) => updateParam("status", v)}
            disabled={isPending}
          >
            <SelectTrigger className="w-full min-w-[150px]">
              <SelectValue placeholder="Sale Status" />
            </SelectTrigger>
            <SelectContent>
              {SALE_STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* From Date */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1">From</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-w-[140px] justify-start text-left font-normal"
                disabled={isPending}
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
        {/* To Date */}
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium mb-1">To</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-w-[140px] justify-start text-left font-normal"
                disabled={isPending}
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
        <form onSubmit={handleSearchSubmit} className="w-full sm:w-auto flex flex-col gap-1">
          <label className="block text-sm font-medium mb-1">Search</label>
          <Input
            type="text"
            placeholder="Name or Reference"
            className="w-full min-w-[180px]"
            value={searchValue}
            onChange={handleSearchInputChange}
            disabled={isPending}
          />
        </form>
        {/* Reset */}
        <div className="w-full sm:w-auto flex flex-row sm:block">
          <Button
            variant="default"
            onClick={resetFilters}
            className="mt-2 sm:mt-5 font-semibold w-full"
            disabled={isPending}
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}  