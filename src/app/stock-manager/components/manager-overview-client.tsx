"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase/client";
import Pagination from "@/components/ui/pagination";
import { Eye, Pencil, Trash2, CalendarIcon, Loader2, Filter } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrencyFormatter } from "@/lib/formatters";
import ManagerAuditDialog from "./manager-audit-dialog";
import { PendingAuditRecordForManager, WarehouseForManager, UserForManager } from "../types";

interface ManagerOverviewClientProps {
  initialPendingAudits: PendingAuditRecordForManager[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  warehouses: WarehouseForManager[];
  controllers: UserForManager[];
  currentUserRole: string;
  currentManagerId: string;
  currentUserBranchId: string | null;
}

export default function ManagerOverviewClient({
  initialPendingAudits,
  totalItems,
  currentPage,
  itemsPerPage,
  warehouses,
  controllers,
  currentManagerId,
  currentUserBranchId,
}: ManagerOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatCurrency } = useCurrencyFormatter();

  // State for filters
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("query") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>(searchParams.get("warehouse") || "all");
  const [controllerFilter, setControllerFilter] = useState<string>(searchParams.get("controller") || "all");
  const getDateFromParam = (param: string | null): Date | undefined => {
    if (!param) return undefined;
    const date = parseISO(param);
    return isValid(date) ? date : undefined;
  };
  const [dateFrom, setDateFrom] = useState<Date | undefined>(getDateFromParam(searchParams.get('dateFrom')));
  const [dateTo, setDateTo] = useState<Date | undefined>(getDateFromParam(searchParams.get('dateTo')));

  // State for dialogs and UI
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedAuditDetails, setSelectedAuditDetails] = useState<PendingAuditRecordForManager | null>(null);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = useState(false);
  const [auditToProcess, setAuditToProcess] = useState<PendingAuditRecordForManager | undefined>(undefined);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [auditToDeleteId, setAuditToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // URL update logic
  const updateURLAndRefresh = (newParams: URLSearchParams) => {
    const path = window.location.pathname;
    router.push(`${path}?${newParams.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (searchQuery) params.set("query", searchQuery); else params.delete("query");
    if (statusFilter !== "all") params.set("status", statusFilter); else params.delete("status");
    if (warehouseFilter !== "all") params.set("warehouse", warehouseFilter); else params.delete("warehouse");
    if (controllerFilter !== "all") params.set("controller", controllerFilter); else params.delete("controller");
    if (dateFrom) params.set("dateFrom", dateFrom.toISOString().split('T')[0]); else params.delete("dateFrom");
    if (dateTo) params.set("dateTo", dateTo.toISOString().split('T')[0]); else params.delete("dateTo");
    updateURLAndRefresh(params);
    setIsFilterSheetOpen(false);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setWarehouseFilter("all");
    setControllerFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    const params = new URLSearchParams();
    params.set("page", "1");
    updateURLAndRefresh(params);
    setIsFilterSheetOpen(false);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    updateURLAndRefresh(params);
  };

  // Dialog handlers
  const handleViewDetails = (audit: PendingAuditRecordForManager) => {
    setSelectedAuditDetails(audit);
    setIsViewDetailsDialogOpen(true);
  };

  const handleProcessAudit = (audit: PendingAuditRecordForManager) => {
    setAuditToProcess(audit);
    setIsAuditDialogOpen(true);
  };
  
  const onAuditProcessed = () => {
    setIsAuditDialogOpen(false);
    setAuditToProcess(undefined);
    router.refresh();
  };

  const openDeleteConfirmDialog = (auditId: string) => {
    setAuditToDeleteId(auditId);
    setIsDeleteConfirmDialogOpen(true);
  };

  const handleDeleteSubmission = async () => {
    if (!auditToDeleteId) return;
    setIsDeleting(true);
    const { error } = await supabaseClient.from("pending_stock_audits").delete().eq("id", auditToDeleteId);
    if (error) {
      toast.error("Failed to delete submission.", { description: error.message });
    } else {
      toast.success("Submission deleted successfully!");
      setIsDeleteConfirmDialogOpen(false);
      setAuditToDeleteId(null);
      router.refresh();
    }
    setIsDeleting(false);
  };

  const getStatusChipClass = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending_audit':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get('query')) count++;
    if (searchParams.get('status') && searchParams.get('status') !== 'all') count++;
    if (searchParams.get('warehouse') && searchParams.get('warehouse') !== 'all') count++;
    if (searchParams.get('controller') && searchParams.get('controller') !== 'all') count++;
    if (searchParams.get('dateFrom') || searchParams.get('dateTo')) count++;
    return count;
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Stock Manager Panel</h1>
          <p className="text-sm text-gray-500 md:text-base">Review and process stock audit submissions.</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-4">
        {/* Desktop Filters */}
        <div className="hidden lg:flex flex-row flex-wrap items-end gap-3 p-3 rounded-lg bg-white border shadow-sm">
            <Input placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-xs" />
            <Select onValueChange={setStatusFilter} value={statusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending_audit">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
            <Select onValueChange={setWarehouseFilter} value={warehouseFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Warehouse" /></SelectTrigger><SelectContent><SelectItem value="all">All Warehouses</SelectItem>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={setControllerFilter} value={controllerFilter}><SelectTrigger className="w-[220px]"><SelectValue placeholder="Controller" /></SelectTrigger><SelectContent><SelectItem value="all">All Controllers</SelectItem>{controllers.map(c => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}</SelectContent></Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateFrom && !dateTo && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? (dateTo ? `${format(dateFrom, "LLL d, y")} - ${format(dateTo, "LLL d, y")}` : format(dateFrom, "LLL d, y")) : <span>Date range</span>}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={{ from: dateFrom, to: dateTo }} onSelect={(r) => { setDateFrom(r?.from); setDateTo(r?.to); }} numberOfMonths={2} /></PopoverContent>
            </Popover>
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
        </div>
        
        {/* Mobile Filter Button */}
        <div className="lg:hidden">
            <Button variant="outline" className="w-full justify-center" onClick={() => setIsFilterSheetOpen(true)}>
                <Filter className="mr-2 h-4 w-4" /> Filters {activeFilterCount > 0 && <span className="ml-2 h-6 w-6 text-xs font-bold text-white bg-blue-500 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
            </Button>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Dialog open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <DialogContent className="sm:max-w-md m-0 p-0 h-full flex flex-col"><DialogHeader className="p-4 border-b"><DialogTitle>Filters</DialogTitle></DialogHeader>
              <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                  <Input placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Select onValueChange={setStatusFilter} value={statusFilter}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending_audit">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
                  <Select onValueChange={setWarehouseFilter} value={warehouseFilter}><SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger><SelectContent><SelectItem value="all">All Warehouses</SelectItem>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
                  <Select onValueChange={setControllerFilter} value={controllerFilter}><SelectTrigger><SelectValue placeholder="Controller" /></SelectTrigger><SelectContent><SelectItem value="all">All Controllers</SelectItem>{controllers.map(c => <SelectItem key={c.id} value={c.id}>{c.email}</SelectItem>)}</SelectContent></Select>
                  <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? format(dateFrom, "LLL d, y") : <span>From date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} /></PopoverContent></Popover>
                  <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateTo ? format(dateTo, "LLL d, y") : <span>To date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} /></PopoverContent></Popover>
              </div>
              <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2"><Button variant="ghost" onClick={resetFilters} className="w-full">Reset</Button><Button onClick={applyFilters} className="w-full">Apply</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Content Area */}
      <Card>
        <CardHeader><CardTitle>Audit Submissions</CardTitle><CardDescription>Review stock counts submitted by controllers.</CardDescription></CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {initialPendingAudits.length > 0 ? initialPendingAudits.map(audit => (
              <Card key={audit.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold">{audit.warehouses?.name}</p>
                    <p className="text-sm text-muted-foreground">{format(parseISO(audit.submission_date), "PP")}</p>
                    <p className="text-xs text-muted-foreground">{audit.recorded_by_controller_user?.email}</p>
                  </div>
                  {/* --- FIX: Changed label for pending status --- */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipClass(audit.status)}`}>
                    {audit.status === 'pending_audit' ? 'pending' : audit.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-4 flex justify-end items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(audit)}><Eye className="h-4 w-4 mr-1"/>View</Button>
                  {audit.status === 'pending_audit' && <Button size="sm" onClick={() => handleProcessAudit(audit)}><Pencil className="h-4 w-4 mr-1"/>Process</Button>}
                  {audit.status !== 'approved' && <Button variant="destructive" size="icon" onClick={() => openDeleteConfirmDialog(audit.id)}><Trash2 className="h-4 w-4"/></Button>}
                </div>
              </Card>
            )) : <div className="text-center py-10 text-muted-foreground">No submissions found.</div>}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader><TableRow><TableHead>Controller</TableHead><TableHead>Warehouse</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {initialPendingAudits.length > 0 ? initialPendingAudits.map(audit => (
                  <TableRow key={audit.id}>
                    <TableCell><div className="font-medium">{audit.recorded_by_controller_user?.email || "N/A"}</div></TableCell>
                    <TableCell>{audit.warehouses?.name || "N/A"}</TableCell>
                    <TableCell>{format(parseISO(audit.submission_date), "PP")}</TableCell>
                    <TableCell>
                      {/* --- FIX: Changed label for pending status --- */}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipClass(audit.status)}`}>
                        {audit.status === 'pending_audit' ? 'Pending' : audit.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(audit)}><Eye className="h-4 w-4" /></Button>
                      {audit.status === 'pending_audit' && <Button variant="ghost" size="icon" onClick={() => handleProcessAudit(audit)}><Pencil className="h-4 w-4" /></Button>}
                      {audit.status !== 'approved' && <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDeleteConfirmDialog(audit.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No submissions found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalItems > 0 && <Pagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={handlePageChange} />}

      {/* Dialogs */}
      <ManagerAuditDialog auditToProcess={auditToProcess} isOpen={isAuditDialogOpen} onClose={() => setIsAuditDialogOpen(false)} onAuditProcessed={onAuditProcessed} currentManagerId={currentManagerId} currentUserBranchId={currentUserBranchId} />
      
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submission Details</DialogTitle><DialogDescription>ID: {selectedAuditDetails?.id}</DialogDescription></DialogHeader>
          {selectedAuditDetails && (
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <p><strong>Controller:</strong> {selectedAuditDetails.recorded_by_controller_user?.email}</p>
                <p><strong>Warehouse:</strong> {selectedAuditDetails.warehouses?.name}</p>
                <p><strong>Submission Date:</strong> {format(parseISO(selectedAuditDetails.submission_date), "PPP p")}</p>
                <p><strong>Status:</strong> {selectedAuditDetails.status.replace(/_/g, " ")}</p>
              </div>
              <p><strong>Controller Notes:</strong> {selectedAuditDetails.notes_from_controller || "N/A"}</p>
              <p><strong>Manager Notes:</strong> {selectedAuditDetails.notes_from_manager || "N/A"}</p>
              <h3 className="font-semibold mt-4">Products</h3>
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead>{selectedAuditDetails.status === 'approved' && <><TableHead className="text-right">Purchase</TableHead><TableHead className="text-right">Sale</TableHead></>}</TableRow></TableHeader>
                <TableBody>
                  {selectedAuditDetails.submission_details.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.product_name} ({item.product_ref})</TableCell>
                      <TableCell>{item.quantity} {item.product_unit_abbreviation}</TableCell>
                      {selectedAuditDetails.status === 'approved' && <>
                        <TableCell className="text-right">{formatCurrency(item.purchase_price || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.sale_price || 0)}</TableCell>
                      </>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsViewDetailsDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Confirm Deletion</DialogTitle><DialogDescription>Are you sure you want to delete this submission? This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setIsDeleteConfirmDialogOpen(false)} disabled={isDeleting}>Cancel</Button><Button variant="destructive" onClick={handleDeleteSubmission} disabled={isDeleting}>{isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Deleting...</> : "Delete"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
