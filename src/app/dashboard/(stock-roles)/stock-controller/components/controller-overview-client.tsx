"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Pagination from '@/components/ui/pagination';
import { Eye, CalendarIcon, Search, PlusCircle, Filter, Pencil } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

// Import the actual form and types
import ControllerSubmissionForm from './controller-submission-form';
import { PendingAuditRecord, WarehouseForController, ProductCategory } from '../types';

interface ControllerOverviewClientProps {
  initialPendingAudits: PendingAuditRecord[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  warehouses: WarehouseForController[];
  allCategories: ProductCategory[];
  recordedByUserId: string;
}

export default function ControllerOverviewClient({
  initialPendingAudits,
  totalItems,
  currentPage,
  itemsPerPage,
  warehouses,
  allCategories,
  recordedByUserId,
}: ControllerOverviewClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Component state
  const [pendingAudits, setPendingAudits] = useState(initialPendingAudits);
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [selectedAuditDetails, setSelectedAuditDetails] = useState<PendingAuditRecord | null>(null);
  const [editingAudit, setEditingAudit] = useState<PendingAuditRecord | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Filter states are initialized from URL search params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  
  const getDateFromParam = (param: string | null): Date | undefined => {
    if (!param) return undefined;
    const date = parseISO(param);
    return isValid(date) ? date : undefined;
  };

  const [dateFrom, setDateFrom] = useState<Date | undefined>(getDateFromParam(searchParams.get('dateFrom')));
  const [dateTo, setDateTo] = useState<Date | undefined>(getDateFromParam(searchParams.get('dateTo')));

  useEffect(() => {
    setPendingAudits(initialPendingAudits);
  }, [initialPendingAudits]);

  const updateURLAndRefresh = (newParams: URLSearchParams) => {
    const path = window.location.pathname;
    router.push(`${path}?${newParams.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (searchQuery) params.set('query', searchQuery); else params.delete('query');
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter); else params.delete('status');
    if (dateFrom) params.set('dateFrom', dateFrom.toISOString().split('T')[0]); else params.delete('dateFrom');
    if (dateTo) params.set('dateTo', dateTo.toISOString().split('T')[0]); else params.delete('dateTo');
    
    updateURLAndRefresh(params);
    setIsFilterSheetOpen(false);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete('query');
    params.delete('status');
    params.delete('dateFrom');
    params.delete('dateTo');
    params.set('page', '1');
    
    updateURLAndRefresh(params);
    setIsFilterSheetOpen(false);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    updateURLAndRefresh(params);
  };
  
  const handleSubmissionSuccess = () => {
    setIsSubmissionDialogOpen(false);
    setEditingAudit(null);
    router.refresh();
  };

  const handleViewDetails = (audit: PendingAuditRecord) => {
    setSelectedAuditDetails(audit);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditDetails = (audit: PendingAuditRecord) => {
    if (audit.status === 'pending_audit') {
      setEditingAudit(audit);
      setIsSubmissionDialogOpen(true);
    } else {
      toast.info("Cannot edit an audit that has already been processed.");
    }
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
    if (searchParams.get('dateFrom') || searchParams.get('dateTo')) count++;
    return count;
  }, [searchParams]);

  return (
    <div className="p-2 sm:p-4 lg:p-6 bg-gray-50 min-h-screen">
      <ControllerSubmissionForm
        warehouses={warehouses}
        allCategories={allCategories}
        recordedByUserId={recordedByUserId}
        isOpen={isSubmissionDialogOpen}
        onClose={() => {
          setIsSubmissionDialogOpen(false);
          setEditingAudit(null);
        }}
        onSubmissionSuccess={handleSubmissionSuccess}
        initialSubmission={editingAudit ?? undefined}
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Stock Controller Panel</h1>
          <p className="text-gray-500">Manage and view your stock audit submissions.</p>
        </div>
        <Button onClick={() => {
          setEditingAudit(null);
          setIsSubmissionDialogOpen(true);
        }} className="w-full md:w-auto shadow-sm">
          <PlusCircle className="mr-2 h-5 w-5" /> New Stock Audit
        </Button>
      </div>

      {/* Filter Section */}
      <div className="mb-4">
        {/* Desktop Filters */}
        <div className="hidden lg:flex flex-row flex-wrap items-end gap-3 p-3 rounded-lg bg-white border shadow-sm">
          <div className="flex-grow min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>
          </div>
          <div>
             <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_audit">Pending Audit</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !dateFrom && !dateTo && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? (dateTo ? `${format(dateFrom, "LLL d, y")} - ${format(dateTo, "LLL d, y")}` : format(dateFrom, "LLL d, y")) : <span>Pick a date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateFrom}
                  selected={{ from: dateFrom, to: dateTo }}
                  onSelect={(range) => { setDateFrom(range?.from); setDateTo(range?.to); }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={applyFilters}>Apply</Button>
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
          </div>
        </div>
        
        {/* Mobile Filter Button */}
        <div className="lg:hidden">
            <Button variant="outline" className="w-full justify-center" onClick={() => setIsFilterSheetOpen(true)}>
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-500 rounded-full">{activeFilterCount}</span>
                )}
            </Button>
        </div>
      </div>

      {/* Mobile Filter Sheet (Dialog) */}
      <Dialog open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <DialogContent className="sm:max-w-md m-0 p-0 h-full flex flex-col">
              <DialogHeader className="p-4 pb-4 border-b">
                  <DialogTitle>Filters</DialogTitle>
              </DialogHeader>
              <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                  <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input placeholder="Search..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      </div>
                  </div>
                  <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                      <Select onValueChange={setStatusFilter} value={statusFilter}>
                          <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="pending_audit">Pending Audit</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateFrom ? (dateTo ? `${format(dateFrom, "LLL d, y")} - ${format(dateTo, "LLL d, y")}` : format(dateFrom, "LLL d, y")) : <span>Pick a date range</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="range" selected={{ from: dateFrom, to: dateTo }} onSelect={(range) => { setDateFrom(range?.from); setDateTo(range?.to); }} /></PopoverContent>
                      </Popover>
                  </div>
              </div>
              <DialogFooter className="p-4 pt-4 border-t flex-col sm:flex-row gap-2">
                  <Button variant="ghost" onClick={resetFilters} className="w-full">Reset</Button>
                  <Button onClick={applyFilters} className="w-full">Apply Filters</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Submissions List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>My Stock Submissions</CardTitle>
          <CardDescription>Overview of your submitted stock counts.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
              {pendingAudits.length > 0 ? pendingAudits.map(audit => (
                  <div key={audit.id} className="bg-white p-3 rounded-lg border shadow-sm" onClick={() => audit.status === 'pending_audit' ? handleEditDetails(audit) : handleViewDetails(audit)}>
                      <div className="flex justify-between items-start">
                          <div>
                              <p className="font-semibold text-gray-800">{audit.warehouses?.name || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{format(parseISO(audit.submission_date), 'MMM d, yyyy')}</p>
                          </div>
                          <div className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipClass(audit.status)}`}>
                              {audit.status.replace(/_/g, ' ')}
                          </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center text-sm">
                          <p className="text-gray-600">{audit.submission_details.length} Products</p>
                          <div className="flex items-center gap-2">
                            {audit.status === 'pending_audit' && <Pencil className="h-4 w-4 text-blue-500" />}
                            <Eye className="h-4 w-4 text-gray-400" />
                          </div>
                      </div>
                  </div>
              )) : (
                <div className="text-center py-10">
                    <p className="text-gray-500">No submissions found.</p>
                </div>
              )}
          </div>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Audit Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAudits.length > 0 ? pendingAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.warehouses?.name || 'N/A'}</TableCell>
                    <TableCell>{format(parseISO(audit.submission_date), 'PPP')}</TableCell>
                    <TableCell>{audit.submission_details.length} Products</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusChipClass(audit.status)}`}>
                           {audit.status.replace(/_/g, ' ')}
                        </span>
                    </TableCell>
                    <TableCell>{audit.audit_date ? format(parseISO(audit.audit_date), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       {audit.status === 'pending_audit' && (
                          <Button variant="ghost" size="icon" onClick={() => handleEditDetails(audit)} className="mr-2">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                          </Button>
                        )}
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(audit)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No submissions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {totalItems > 0 && (
        <div className="mt-6">
            <Pagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={handlePageChange}
            />
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Stock Audit Details</DialogTitle>
            <DialogDescription>ID: {selectedAuditDetails?.id}</DialogDescription>
          </DialogHeader>
          {selectedAuditDetails && (
            <div className="flex-grow overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                  <p><strong>Warehouse:</strong> {selectedAuditDetails.warehouses?.name}</p>
                  <p><strong>Status:</strong> <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusChipClass(selectedAuditDetails.status)}`}>{selectedAuditDetails.status.replace(/_/g, ' ')}</span></p>
                  <p><strong>Submission Date:</strong> {format(parseISO(selectedAuditDetails.submission_date), 'PPP p')}</p>
                  <p><strong>Recorded By:</strong> {selectedAuditDetails.recorded_by_controller_user?.email || 'N/A'}</p>
                  <p><strong>Audit Date:</strong> {selectedAuditDetails.audit_date ? format(parseISO(selectedAuditDetails.audit_date), 'PPP p') : 'N/A'}</p>
                  <p><strong>Audited By:</strong> {selectedAuditDetails.audited_by_manager_user?.email || 'N/A'}</p>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Controller Notes:</strong> {selectedAuditDetails.notes_from_controller || 'N/A'}</p>
                <p><strong>Manager Notes:</strong> {selectedAuditDetails.notes_from_manager || 'N/A'}</p>
              </div>
              <h3 className="text-base font-semibold mt-6 mb-2">Submitted Products</h3>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedAuditDetails.submission_details.length > 0 ? (
                      selectedAuditDetails.submission_details.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground">Ref: {item.product_ref}</div>
                          </TableCell>
                          <TableCell>{allCategories.find(c => c.id === item.category_id)?.name || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity} <span className="text-muted-foreground text-xs">{item.product_unit_abbreviation}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={3} className="text-center">No products submitted.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  ); 
}
 