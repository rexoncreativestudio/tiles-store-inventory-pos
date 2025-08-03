"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";
import Pagination from "@/components/ui/pagination";
import { Eye, Pencil, Trash2, CalendarIcon, Loader2 } from "lucide-react";

import {
  PendingAuditRecordForManager,
  WarehouseForManager,
} from "../types";

import ManagerAuditDialog from "./manager-audit-dialog";

// Status badge color utility
const statusStyles = {
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  pending_audit: "bg-yellow-100 text-yellow-900",
};

const statusLabels = {
  approved: "Approved",
  rejected: "Rejected",
  pending_audit: "Pending Audit",
};

interface ManagerAuditTableProps {
  initialPendingAudits: PendingAuditRecordForManager[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  warehouses: WarehouseForManager[];
  currentUserRole: string;
  currentManagerId: string;
  currentUserBranchId: string | null;
}

export default function ManagerAuditTable({
  initialPendingAudits,
  totalItems,
  currentPage,
  itemsPerPage,
  warehouses,
  currentManagerId,
  currentUserBranchId,
}: ManagerAuditTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Helper to safely parse dates from URL params
  const getDateFromParam = (param: string | null): Date | undefined => {
    if (!param) return undefined;
    const date = parseISO(param);
    return isValid(date) ? date : undefined;
  };

  // Filter states are initialized from URL search params
  const [warehouseFilter, setWarehouseFilter] = useState<string>(searchParams.get("warehouse") || "all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(getDateFromParam(searchParams.get("dateFrom")));
  const [dateTo, setDateTo] = useState<Date | undefined>(getDateFromParam(searchParams.get("dateTo")));

  // Dialog state
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedAuditDetails, setSelectedAuditDetails] = useState<PendingAuditRecordForManager | null>(null);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [auditToProcess, setAuditToProcess] = useState<PendingAuditRecordForManager | undefined>(undefined);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [auditToDeleteId, setAuditToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * This effect hook automatically applies filters when their state changes.
   * It constructs the URL with the current filter values and pushes it to the router.
   */
  useEffect(() => {
    // Prevent applying filters on the initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");

    if (warehouseFilter && warehouseFilter !== "all") {
      params.set("warehouse", warehouseFilter);
    } else {
      params.delete("warehouse");
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom.toISOString().split('T')[0]);
    } else {
      params.delete("dateFrom");
    }
    
    if (dateTo) {
      params.set("dateTo", dateTo.toISOString().split('T')[0]);
    } else {
      params.delete("dateTo");
    }
    
    // Using router.push to navigate and trigger a data refetch
    router.push(`${window.location.pathname}?${params.toString()}`);

  }, [warehouseFilter, dateFrom, dateTo, router, searchParams]); // Dependency array ensures this runs only when filters change

  /**
   * Resets all filters to their default values, which in turn triggers the useEffect.
   */
  const resetFilters = () => {
    setWarehouseFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  /**
   * Handles pagination by updating the 'page' parameter in the URL.
   * @param {number} page - The page number to navigate to.
   */
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const handleViewDetails = (audit: PendingAuditRecordForManager) => {
    setSelectedAuditDetails(audit);
    setIsViewDetailsDialogOpen(true);
  };

  const handleProcessAudit = (audit: PendingAuditRecordForManager) => {
    setAuditToProcess(audit);
    setIsAuditDialogOpen(true);
  };

  const openDeleteConfirmDialog = (auditId: string) => {
    setAuditToDeleteId(auditId);
    setIsDeleteConfirmDialogOpen(true);
  };

  const handleDeleteSubmission = async () => {
    if (!auditToDeleteId) return;
    setIsDeleting(true);
    const { error } = await supabaseClient
      .from("pending_stock_audits")
      .delete()
      .eq("id", auditToDeleteId);
    if (error) {
      toast.error("Failed to delete submission.", { description: error.message });
      console.error("Delete submission error:", error);
    } else {
      toast.success("Submission deleted successfully!");
      handleCloseModals();
      router.refresh();
    }
    setIsDeleting(false);
  };

  const handleCloseModals = () => {
    setIsViewDetailsDialogOpen(false);
    setIsAuditDialogOpen(false);
    setIsDeleteConfirmDialogOpen(false);
    setSelectedAuditDetails(null);
    setAuditToProcess(undefined);
    setAuditToDeleteId(null);
  };

  const onAuditProcessed = () => {
    handleCloseModals();
    router.refresh();
  };

  // Responsive Table/Card UI
  return (
    <div className="space-y-6">
      {/* Filters - full width container for buttons */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6 p-4 rounded-lg shadow-sm bg-white border w-full">
        <Select onValueChange={setWarehouseFilter} value={warehouseFilter}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full md:w-[260px] justify-start text-left font-normal",
                !dateFrom && !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? (
                dateTo
                  ? `${format(dateFrom, "PPP")} - ${format(dateTo, "PPP")}`
                  : format(dateFrom, "PPP")
              ) : (
                <span>Select date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={{ from: dateFrom, to: dateTo }}
              onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                setDateFrom(range?.from);
                setDateTo(range?.to);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={resetFilters} className="w-full md:w-auto self-end">
          Reset Filters
        </Button>
      </div>

      {/* Responsive Table/Card */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Audit Submissions</CardTitle>
          <CardDescription>
            Overview of stock counts submitted for audit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* MOBILE: Cards, DESKTOP: Table */}
          <div className="block md:hidden space-y-4">
            {initialPendingAudits && initialPendingAudits.length > 0 ? (
              initialPendingAudits.map((audit) => (
                <div
                  key={audit.id}
                  className="rounded-lg border p-4 bg-white flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{audit.warehouses?.name || "N/A"}</span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                        "bg-opacity-70",
                        statusStyles[audit.status as keyof typeof statusStyles]
                      )}
                    >
                      {statusLabels[audit.status as keyof typeof statusLabels] || audit.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Submission: {audit.submission_date ? format(parseISO(audit.submission_date), "PPP") : "N/A"}
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewDetails(audit)}
                      title="View Details"
                      className="p-2"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {audit.status === "pending_audit" && (
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => handleProcessAudit(audit)}
                        title="Process Audit"
                        className="p-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {audit.status !== "approved" && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => openDeleteConfirmDialog(audit.id)}
                        title="Delete Submission"
                        className="p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No stock audit submissions found.
              </div>
            )}
          </div>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]">SN</TableHead>
                  <TableHead className="w-[12%]">Submission Date</TableHead>
                  <TableHead className="w-[15%]">Warehouse</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[10%]">Audit Date</TableHead>
                  <TableHead className="w-[10%]">Audited By</TableHead>
                  <TableHead className="w-[13%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialPendingAudits && initialPendingAudits.length > 0 ? (
                  initialPendingAudits.map((audit, idx) => (
                    <TableRow key={audit.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        {audit.submission_date
                          ? format(parseISO(audit.submission_date), "PPP")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {audit.warehouses?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                            "bg-opacity-70",
                            statusStyles[audit.status as keyof typeof statusStyles]
                          )}
                        >
                          {statusLabels[audit.status as keyof typeof statusLabels] || audit.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {audit.audit_date
                          ? format(parseISO(audit.audit_date), "PPP")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {audit.audited_by_manager_user?.email || "N/A"}
                      </TableCell>
                      <TableCell className="text-right flex space-x-2 justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDetails(audit)}
                          title="View Details"
                          className="p-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {audit.status === "pending_audit" && (
                          <Button
                            variant="default"
                            size="icon"
                            onClick={() => handleProcessAudit(audit)}
                            title="Process Audit"
                            className="p-2"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {audit.status !== "approved" && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => openDeleteConfirmDialog(audit.id)}
                            title="Delete Submission"
                            className="p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No stock audit submissions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalItems > itemsPerPage && (
        <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={handlePageChange}
        />
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock Audit Submission Details</DialogTitle>
            <DialogDescription>
              Details for audit ID: {selectedAuditDetails?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedAuditDetails && (
            <div className="grid gap-4 py-4 text-sm">
              <p>
                <strong>Submission Date:</strong>{" "}
                {selectedAuditDetails.submission_date
                  ? format(parseISO(selectedAuditDetails.submission_date), "PPP p")
                  : "N/A"}
              </p>
              <p>
                <strong>Warehouse:</strong>{" "}
                {selectedAuditDetails.warehouses?.name || "N/A"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold capitalize",
                    "bg-opacity-70",
                    statusStyles[selectedAuditDetails.status as keyof typeof statusStyles]
                  )}
                >
                  {statusLabels[selectedAuditDetails.status as keyof typeof statusLabels] || selectedAuditDetails.status}
                </span>
              </p>
              {selectedAuditDetails.audit_date && (
                <p>
                  <strong>Audit Date:</strong>{" "}
                  {format(parseISO(selectedAuditDetails.audit_date), "PPP p")}
                </p>
              )}
              {selectedAuditDetails.audited_by_manager_user && (
                <p>
                  <strong>Audited By:</strong>{" "}
                  {selectedAuditDetails.audited_by_manager_user.email}
                </p>
              )}
              {selectedAuditDetails.notes_from_controller && (
                <p>
                  <strong>Controller Notes:</strong>{" "}
                  {selectedAuditDetails.notes_from_controller}
                </p>
              )}
              {selectedAuditDetails.notes_from_manager && (
                <p>
                  <strong>Manager Notes:</strong>{" "}
                  {selectedAuditDetails.notes_from_manager}
                </p>
              )}

              <h3 className="text-base font-semibold mt-4 mb-2">
                Submitted Products
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAuditDetails.submission_details.length > 0 ? (
                    selectedAuditDetails.submission_details.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.product_ref}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.product_unit_abbreviation || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-16 text-center"
                      >
                        No products in this submission.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseModals}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stock audit submission (ID:{" "}
              {auditToDeleteId})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModals} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmission}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager Audit Dialog */}
      <ManagerAuditDialog
        auditToProcess={auditToProcess}
        isOpen={isAuditDialogOpen}
        onClose={handleCloseModals}
        onAuditProcessed={onAuditProcessed}
        currentManagerId={currentManagerId}
        currentUserBranchId={currentUserBranchId}
      />
    </div>
  );
}
