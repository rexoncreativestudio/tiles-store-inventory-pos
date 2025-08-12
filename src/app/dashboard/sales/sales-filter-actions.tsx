"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Filter, CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import React, { useState, useTransition } from "react";

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
  mobileMode?: boolean; // NEW: Use dialog on mobile
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
  mobileMode = false,
}: SalesFilterActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Today's date for defaulting
  const today = new Date();
  const firstDay = getFirstDayOfMonth(today);
  const lastDay = getLastDayOfMonth(today);

  // Controlled filter state (sync with searchParams)
  const dateFrom = searchParams.get("dateFrom") || format(firstDay, "yyyy-MM-dd");
  const dateTo = searchParams.get("dateTo") || format(lastDay, "yyyy-MM-dd");
  const branchId = searchParams.get("branchId") ?? "all";
  const saleType = searchParams.get("saleType") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";

  // Local state for input fields (to avoid flicker)
  const [searchValue, setSearchValue] = useState(search);
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);

  function updateParam(name: string, value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === undefined || value === null) {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      if ((name === "dateFrom" || name === "dateTo") && !searchParams.get("dateFrom") && !searchParams.get("dateTo")) {
        params.set("dateFrom", format(firstDay, "yyyy-MM-dd"));
        params.set("dateTo", format(lastDay, "yyyy-MM-dd"));
      }
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function resetFilters() {
    startTransition(() => router.replace(pathname));
    setSearchValue("");
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    updateParam("search", e.target.value.trim());
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("search", searchValue.trim());
  };

  // Count active filters for badge
  const activeFilterCount =
    (branchId && branchId !== "all" ? 1 : 0) +
    (saleType && saleType !== "all" ? 1 : 0) +
    (status && status !== "all" ? 1 : 0) +
    (searchValue ? 1 : 0) +
    ((dateFrom && dateFrom !== format(firstDay, "yyyy-MM-dd")) ? 1 : 0) +
    ((dateTo && dateTo !== format(lastDay, "yyyy-MM-dd")) ? 1 : 0);

  // --- Desktop rendering ---
  if (!mobileMode) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex flex-col gap-4 w-full sm:flex-row sm:flex-wrap sm:items-end">
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
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
                  <CalendarIcon className="mr-2 h-4 w-4" />
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

  // --- Mobile rendering with Dialog ---
  return (
    <>
      {/* Trigger Button for mobile filter */}
      <Button
        variant="outline"
        className="w-full flex justify-center items-center gap-2"
        onClick={() => setMobileDialogOpen(true)}
      >
        <Filter className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-500 rounded-full">{activeFilterCount}</span>
        )}
      </Button>
      <Dialog open={mobileDialogOpen} onOpenChange={setMobileDialogOpen}>
        <DialogContent className="sm:max-w-md m-0 p-0 h-full flex flex-col">
          <DialogHeader className="p-4 pb-4 border-b">
            <DialogTitle>Sales Filters</DialogTitle>
          </DialogHeader>
          <div className="flex-grow p-4 space-y-6 overflow-y-auto">
            {/* Branch */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Branch</label>
              <Select
                value={branchId}
                onValueChange={(v) => updateParam("branchId", v)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
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
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sale Type</label>
              <Select
                value={saleType}
                onValueChange={(v) => updateParam("saleType", v)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
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
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <Select
                value={status}
                onValueChange={(v) => updateParam("status", v)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
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
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isPending}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isPending}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Name or Reference"
                  className="w-full pl-10"
                  value={searchValue}
                  onChange={handleSearchInputChange}
                  disabled={isPending}
                />
              </div>
            </form>
          </div>
          <DialogFooter className="p-4 pt-4 border-t flex-col gap-2">
            <Button variant="ghost" onClick={() => { resetFilters(); setMobileDialogOpen(false); }} className="w-full">Reset</Button>
            <Button onClick={() => setMobileDialogOpen(false)} className="w-full">Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}  