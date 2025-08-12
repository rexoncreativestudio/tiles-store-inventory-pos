"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useRouter } from 'next/navigation';
import { Printer, Eye, Loader2, CalendarIcon, ShoppingCart, ExternalLink, Edit2 } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useCurrencyFormatter } from '@/lib/formatters';
import {
  Card, CardContent, CardTitle, CardHeader
} from "@/components/ui/card";
import { supabaseClient } from "@/lib/supabase/client";
import type { SaleRecordForRecentSales, BranchForFilter, SaleItemDetailsForRecentSales } from "../types";

// --- Type Definitions (MODIFIED) ---
type EditSaleFields = {
  customer_name: string;
  customer_phone: string | null;
  sale_date: Date; // <-- ADDED: To handle the sale date editing
  sale_items: {
    id: string;
    quantity: number;
    unit_sale_price: number;
    note: string | null;
    product_name?: string; // for external sales
  }[];
};

type EditSaleState = {
  open: boolean;
  sale: SaleRecordForRecentSales | null;
  editedFields: EditSaleFields | null;
  saving: boolean;
  error: string | null;
};

interface RecentSalesModalClientProps {
  initialRecentSales?: SaleRecordForRecentSales[];
  isOpen: boolean;
  onClose: () => void;
  currentCashierId: string;
  currentUserRole: string;
  currentUserBranchId: string;
  branches: BranchForFilter[];
}

// Helper: Normalize products in sale_items to always be object or null
function normalizeProducts(products: unknown): SaleItemDetailsForRecentSales['products'] | null {
  if (Array.isArray(products)) {
    return products[0] ?? null;
  }
  if (products && typeof products === 'object') {
    return products as SaleItemDetailsForRecentSales['products'];
  }
  return null;
}

// Helper: Normalize sale_items (for "Sale" rows)
function normalizeSaleItems(sale_items: unknown): SaleItemDetailsForRecentSales[] {
  if (!Array.isArray(sale_items)) return [];
  return sale_items.map((item) => ({
    ...item,
    products: normalizeProducts(item.products)
  }));
}

// Helper: Normalize sale_items (for "External Sale" rows, doesn't have "products")
function normalizeExternalSaleItems(external_sale_items: unknown): SaleItemDetailsForRecentSales[] {
  if (!Array.isArray(external_sale_items)) return [];
  return external_sale_items.map((item) => ({ ...item }));
}

function getMonthRange(today = new Date()) {
  return {
    from: startOfMonth(today),
    to: endOfMonth(today),
  };
}

export default function RecentSalesModalClient({
  initialRecentSales = [],
  isOpen,
  onClose,
  currentCashierId,
  currentUserRole,
  currentUserBranchId,
  branches,
}: RecentSalesModalClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  const { from: monthStart, to: monthEnd } = useMemo(() => getMonthRange(), []);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(monthStart);
  const [dateTo, setDateTo] = useState<Date | undefined>(monthEnd);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isSaleDetailsDialogOpen, setIsSaleDetailsDialogOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleRecordForRecentSales | null>(null);

  const [allSales, setAllSales] = useState<SaleRecordForRecentSales[]>(initialRecentSales);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editSaleState, setEditSaleState] = useState<EditSaleState>({
    open: false,
    sale: null,
    editedFields: null,
    saving: false,
    error: null,
  });

  // Normalize role
  const normalizedRole = useMemo(
    () => (currentUserRole || "").replace(/[_\s]/g, "").toLowerCase(),
    [currentUserRole]
  );
  const isCashier = normalizedRole === "cashier";
  const isBranchManager = normalizedRole === "branchmanager";
  const isAdminOrGM = normalizedRole === "admin" || normalizedRole === "generalmanager";

  // Permission: can edit this sale?
  function canEditSale(sale: SaleRecordForRecentSales) {
    if (isAdminOrGM) return true;
    if (isBranchManager) return sale.branch_id === currentUserBranchId;
    if (isCashier) return sale.cashier_id === currentCashierId && sale.branch_id === currentUserBranchId;
    return false;
  }

  // REFACTORED: Moved fetchAllSales outside of useEffect and wrapped in useCallback
  const fetchAllSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sales, error: salesError } = await supabaseClient
        .from("sales")
        .select(`
          id, sale_date, cashier_id, branch_id, customer_name, customer_phone, total_amount, payment_method, transaction_reference, status, created_at, updated_at,
          users ( id, email, role ),
          branches ( id, name ),
          sale_items (
            id, product_id, quantity, unit_sale_price, total_price, note,
            products ( id, name, unique_reference, product_unit_abbreviation, purchase_price )
          )
        `)
        .order("sale_date", { ascending: false })
        .limit(50);

      if (salesError) throw salesError;

      const { data: externalSales, error: externalSalesError } = await supabaseClient
        .from("external_sales")
        .select(`
          id, sale_date, cashier_id, branch_id, customer_name, customer_phone, total_amount, payment_method, transaction_reference, status, created_at, updated_at,
          users:cashier_id ( id, email, role ),
          branches ( id, name ),
          external_sale_items (
            id, product_name, product_category_name, product_unit_name, quantity, unit_sale_price, unit_purchase_price_negotiated, total_cost, total_price, note
          )
        `)
        .order("sale_date", { ascending: false })
        .limit(50);

      if (externalSalesError) throw externalSalesError;

      const externalSalesFormatted: SaleRecordForRecentSales[] = (externalSales ?? []).map((sale) => ({
        id: sale.id,
        sale_date: sale.sale_date,
        cashier_id: sale.cashier_id,
        branch_id: sale.branch_id,
        customer_name: sale.customer_name,
        customer_phone: sale.customer_phone,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        transaction_reference: sale.transaction_reference,
        status: sale.status,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
        users: Array.isArray(sale.users) ? sale.users[0] ?? null : sale.users ?? null,
        branches: Array.isArray(sale.branches) ? sale.branches[0] ?? null : sale.branches ?? null,
        sale_items: normalizeExternalSaleItems(sale.external_sale_items),
        saleType: "External Sale"
      }));

      const salesFormatted: SaleRecordForRecentSales[] = (sales ?? []).map((sale) => ({
        id: sale.id,
        sale_date: sale.sale_date,
        cashier_id: sale.cashier_id,
        branch_id: sale.branch_id,
        customer_name: sale.customer_name,
        customer_phone: sale.customer_phone,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        transaction_reference: sale.transaction_reference,
        status: sale.status,
        created_at: sale.created_at,
        updated_at: sale.updated_at,
        users: Array.isArray(sale.users) ? sale.users[0] ?? null : sale.users ?? null,
        branches: Array.isArray(sale.branches) ? sale.branches[0] ?? null : sale.branches ?? null,
        sale_items: normalizeSaleItems(sale.sale_items),
        saleType: "Sale"
      }));

      const mergedSales = [...salesFormatted, ...externalSalesFormatted].sort(
        (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      );

      setAllSales(mergedSales);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as it doesn't rely on changing props/state

  useEffect(() => {
    if (isOpen) {
      fetchAllSales();
    }
  }, [isOpen, fetchAllSales]);

  const branchOptions = useMemo(() => {
    if ((isCashier || isBranchManager) && branches.length > 0) {
      return [branches[0]];
    }
    return [{ id: "all", name: "All Branches" }, ...branches];
  }, [branches, isCashier, isBranchManager]);

  const filteredSales = useMemo(() => {
    let salesToDisplay = allSales;

    if (isCashier) {
      const branchId = branches[0]?.id;
      salesToDisplay = salesToDisplay.filter(
        (sale) =>
          sale.cashier_id === currentCashierId &&
          sale.branch_id === branchId
      );
    } else if (isBranchManager) {
      salesToDisplay = salesToDisplay.filter(
        (sale) => sale.branch_id === currentUserBranchId
      );
    } else if (selectedBranch !== 'all') {
      salesToDisplay = salesToDisplay.filter(sale => sale.branch_id === selectedBranch);
    }

    if (dateFrom && dateTo) {
      salesToDisplay = salesToDisplay.filter(sale => {
        const saleDate = parseISO(sale.sale_date);
        return isWithinInterval(saleDate, { start: dateFrom, end: dateTo });
      });
    }

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      salesToDisplay = salesToDisplay.filter(sale =>
        sale.transaction_reference.toLowerCase().includes(lowerCaseQuery) ||
        (sale.customer_name && sale.customer_name.toLowerCase().includes(lowerCaseQuery)) ||
        (sale.users?.email && sale.users.email.toLowerCase().includes(lowerCaseQuery))
      );
    }

    if (selectedStatus !== 'all') {
      salesToDisplay = salesToDisplay.filter(sale => sale.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      salesToDisplay = salesToDisplay.filter(sale => {
        if (selectedType === "regular" && sale.saleType === "Sale") return true;
        if (selectedType === "external" && sale.saleType === "External Sale") return true;
        return false;
      });
    }

    return salesToDisplay;
  }, [
    allSales,
    dateFrom,
    dateTo,
    searchQuery,
    selectedBranch,
    selectedStatus,
    selectedType,
    currentCashierId,
    currentUserBranchId,
    branches,
    isCashier,
    isBranchManager,
  ]);

  const totalSalesCount = filteredSales.length;
  const totalIncome = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);

  const handleViewDetails = (sale: SaleRecordForRecentSales) => {
    setSelectedSaleDetails(sale);
    setIsSaleDetailsDialogOpen(true);
  };

  const handleReprintReceipt = (
    transactionRef: string,
    saleType?: "Sale" | "External Sale"
  ) => {
    if (saleType === "External Sale") {
      router.push(`/receipt/external/${transactionRef}`);
    } else {
      router.push(`/receipt/${transactionRef}`);
    }
    onClose();
  };

  const handleResetFilters = () => {
    setDateFrom(monthStart);
    setDateTo(monthEnd);
    setSearchQuery('');
    setSelectedBranch((isCashier || isBranchManager) && branches.length > 0 ? branches[0].id : 'all');
    setSelectedStatus('all');
    setSelectedType('all');
  };

  const getStatusColorClass = (status: SaleRecordForRecentSales["status"]) => {
    switch (status) {
      case 'completed': return 'text-green-600 font-medium';
      case 'held': return 'text-yellow-600 font-medium';
      default: return '';
    }
  };

  // --- MODIFIED: handleEditSale ---
  // Initializes the state for the edit modal, now including the sale_date.
  const handleEditSale = (sale: SaleRecordForRecentSales) => {
    setEditSaleState({
      open: true,
      sale,
      editedFields: {
        customer_name: sale.customer_name || "",
        customer_phone: sale.customer_phone || "",
        sale_date: parseISO(sale.sale_date), // <-- ADDED: Parse string date to Date object
        sale_items: sale.sale_items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unit_sale_price: item.unit_sale_price,
          note: item.note ?? "",
          ...(sale.saleType === "External Sale" ? { product_name: item.product_name ?? "" } : {}),
        })),
      },
      saving: false,
      error: null,
    });
  };

  const handleEditFieldChange = (field: 'customer_name' | 'customer_phone', value: string) => {
    setEditSaleState(prev => {
      if (!prev.editedFields) return prev;
      return {
        ...prev,
        editedFields: {
          ...prev.editedFields,
          [field]: value,
        }
      };
    });
  };

  // --- NEW: handleEditSaleDateChange ---
  // Handler for when a new date is selected in the edit modal's calendar.
  const handleEditSaleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setEditSaleState(prev => {
      if (!prev.editedFields) return prev;
      return {
        ...prev,
        editedFields: {
          ...prev.editedFields,
          sale_date: date,
        },
      };
    });
  };

  const handleEditSaleItemFieldChange = (
    idx: number,
    field: keyof EditSaleFields['sale_items'][0],
    value: any
  ) => {
    setEditSaleState(prev => {
      if (!prev.editedFields) return prev;
      const newItems = [...prev.editedFields.sale_items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      return {
        ...prev,
        editedFields: {
          ...prev.editedFields,
          sale_items: newItems,
        }
      };
    });
  };

  const editedTotalAmount = useMemo(() => {
    if (!editSaleState.editedFields) return 0;
    return editSaleState.editedFields.sale_items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_sale_price),
      0
    );
  }, [editSaleState.editedFields]);

  // --- MODIFIED: handleSaveEditSale ---
  // Now includes the sale_date in the update payload.
  const handleSaveEditSale = async () => {
    if (!editSaleState.sale || !editSaleState.editedFields) return;
    setEditSaleState(prev => ({ ...prev, saving: true, error: null }));

    if (!canEditSale(editSaleState.sale)) {
      setEditSaleState(prev => ({
        ...prev,
        saving: false,
        error: "You do not have permission to edit this sale.",
      }));
      return;
    }

    // --- MODIFICATION ---
    const saleUpdate = {
      customer_name: editSaleState.editedFields.customer_name,
      customer_phone: editSaleState.editedFields.customer_phone,
      total_amount: editedTotalAmount,
      sale_date: editSaleState.editedFields.sale_date.toISOString(), // <-- ADDED: Convert Date back to ISO string for DB
    };

    const saleItemsUpdate = editSaleState.editedFields.sale_items.map(item => {
      const base = {
        id: item.id,
        quantity: item.quantity,
        unit_sale_price: item.unit_sale_price,
        note: item.note,
      };
      if (editSaleState.sale?.saleType === "External Sale") {
        return { ...base, product_name: item.product_name };
      }
      return base;
    });

    try {
      const { error: saleError } = await supabaseClient
        .from(editSaleState.sale.saleType === "Sale" ? "sales" : "external_sales")
        .update(saleUpdate)
        .eq("id", editSaleState.sale.id);

      if (saleError) throw new Error(saleError.message);

      for (const item of saleItemsUpdate) {
        const table =
          editSaleState.sale.saleType === "Sale"
            ? "sale_items"
            : "external_sale_items";
        const updatePayload =
          table === "external_sale_items"
            ? { quantity: item.quantity, unit_sale_price: item.unit_sale_price, note: item.note, product_name: (item as any).product_name }
            : { quantity: item.quantity, unit_sale_price: item.unit_sale_price, note: item.note };
        const { error: itemError } = await supabaseClient
          .from(table)
          .update(updatePayload)
          .eq("id", item.id);
        if (itemError) throw new Error(itemError.message);
      }

      setEditSaleState({
        open: false,
        sale: null,
        editedFields: null,
        saving: false,
        error: null,
      });
      await fetchAllSales();

    } catch (err: any) {
      setEditSaleState(prev => ({
        ...prev,
        saving: false,
        error: err.message || "Failed to update sale.",
      }));
    }
  };

  useEffect(() => {
    if ((isCashier || isBranchManager) && branches.length > 0) {
      setSelectedBranch(branches[0].id);
    }
  }, [isOpen, isCashier, isBranchManager, branches]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1400px] max-h-[98vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recent Sales Overview</DialogTitle>
          <DialogDescription>
            Review and filter your latest sales transactions.
          </DialogDescription>
        </DialogHeader>
        {/* ... (Error and stats cards remain the same) ... */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error loading sales:</strong> {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales Count</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSalesCount}</div>
              <p className="text-xs text-muted-foreground">Transactions recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income (Filtered)</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
              <p className="text-xs text-muted-foreground">Gross income for filtered sales</p>
            </CardContent>
          </Card>
        </div>
        {/* ... (Filter section remains the same) ... */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="grid gap-1 flex-grow min-w-[210px]">
            <Label htmlFor="search_sales">Search</Label>
            <Input
              id="search_sales"
              placeholder="Ref, Customer, Cashier Email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="grid gap-1 min-w-[180px]">
            <Label htmlFor="date_from_sales">Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1 min-w-[180px]">
            <Label htmlFor="date_to_sales">Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1 min-w-[160px]">
            <Label htmlFor="branch_sales_filter">Branch</Label>
            <Select
              onValueChange={setSelectedBranch}
              value={selectedBranch}
              disabled={isCashier || isBranchManager}
            >
              <SelectTrigger className="w-full" id="branch_sales_filter">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1 min-w-[140px]">
            <Label htmlFor="status_sales_filter">Status</Label>
            <Select onValueChange={setSelectedStatus} value={selectedStatus}>
              <SelectTrigger className="w-full" id="status_sales_filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="held">Held</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1 min-w-[120px]">
            <Label htmlFor="type_sales_filter">Type</Label>
            <Select onValueChange={setSelectedType} value={selectedType}>
              <SelectTrigger className="w-full" id="type_sales_filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular Sale</SelectItem>
                <SelectItem value="external">External Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="self-end">
            <Button onClick={handleResetFilters} variant="outline">Reset</Button>
          </div>
        </div>

        {/* ... (Main table remains the same) ... */}
        <div
          className="w-full rounded border bg-white shadow-sm mb-2"
          style={{ maxHeight: "480px", overflow: "auto", minWidth: 1100 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin h-8 w-8 mr-2" />
              Loading recent sales...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SN</TableHead>
                  <TableHead>Ref.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale, idx) => (
                    <TableRow key={sale.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{sale.transaction_reference}</TableCell>
                      <TableCell>
                        <span
                          className={
                            sale.saleType === "External Sale"
                              ? "text-orange-700 font-bold"
                              : "text-blue-700 font-bold"
                          }
                        >
                          {sale.saleType}
                        </span>
                      </TableCell>
                      <TableCell>{format(parseISO(sale.sale_date), 'PPP')}</TableCell>
                      <TableCell>{sale.branches?.name || 'N/A'}</TableCell>
                      <TableCell>{sale.customer_name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <span className={getStatusColorClass(sale.status)}>
                          {sale.status.replace("_", " ").toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewDetails(sale)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEditSale(sale) && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditSale(sale)}
                            title="Edit Sale"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprintReceipt(sale.transaction_reference, sale.saleType)}
                          title="Reprint Receipt"
                        >
                          <ExternalLink className="h-4 w-4" /> Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">No sales found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ... (Sale Details Modal remains the same) ... */}
        <Dialog open={isSaleDetailsDialogOpen} onOpenChange={setIsSaleDetailsDialogOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                <DialogTitle>Sale Details: {selectedSaleDetails?.transaction_reference}</DialogTitle>
                <DialogDescription>
                    Details of the {selectedSaleDetails?.saleType === "External Sale" ? "external sale" : "sale"}.
                </DialogDescription>
                </DialogHeader>
                {selectedSaleDetails && (
                <>
                    <div className="grid grid-cols-2 gap-4 text-sm py-4">
                    <p><span className="font-semibold">Type:</span> <span className={selectedSaleDetails?.saleType === "External Sale" ? "text-orange-700 font-bold" : "text-blue-700 font-bold"}>{selectedSaleDetails?.saleType}</span></p>
                    <p><span className="font-semibold">Date:</span> {format(parseISO(selectedSaleDetails.sale_date), 'PPP')}</p>
                    <p><span className="font-semibold">Cashier:</span> {selectedSaleDetails.users?.email || 'N/A'}</p>
                    <p><span className="font-semibold">Branch:</span> {selectedSaleDetails.branches?.name || 'N/A'}</p>
                    <p><span className="font-semibold">Customer:</span> {selectedSaleDetails.customer_name || 'Walk-in'}</p>
                    <p><span className="font-semibold">Customer Phone:</span> {selectedSaleDetails.customer_phone || 'N/A'}</p>
                    <p><span className="font-semibold">Total Amount:</span> {formatCurrency(selectedSaleDetails.total_amount)}</p>
                    <p><span className="font-semibold">Payment Method:</span> {selectedSaleDetails.payment_method}</p>
                    <p><span className="font-semibold">Status:</span> <span className={getStatusColorClass(selectedSaleDetails.status)}>{selectedSaleDetails.status.replace("_", " ").toUpperCase()}</span></p>
                    </div>
                    <h3 className="text-lg font-semibold mt-4 mb-3">Items Sold</h3>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Note</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedSaleDetails.sale_items && selectedSaleDetails.sale_items.length > 0 ? (
                        selectedSaleDetails.sale_items.map(item => (
                            <TableRow key={item.id}>
                            <TableCell className="font-medium">
                                {item.products?.name ||
                                item.product_name ||
                                'N/A'}
                                {item.products?.unique_reference ? ` (${item.products.unique_reference})` : ""}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-center">
                                {item.products?.product_unit_abbreviation ||
                                item.product_unit_name ||
                                'N/A'}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_sale_price)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                            <TableCell>{item.note || 'N/A'}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-16 text-center">No items found for this sale.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </>
                )}
                <DialogFooter>
                <Button onClick={() => setIsSaleDetailsDialogOpen(false)}>Close</Button>
                {selectedSaleDetails && (
                    <Button onClick={() => handleReprintReceipt(selectedSaleDetails.transaction_reference, selectedSaleDetails.saleType)}>
                    <Printer className="h-4 w-4 mr-2" /> Reprint Receipt
                    </Button>
                )}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* --- MODIFIED: Edit Sale Modal --- */}
        {/* The UI for this modal now includes the sale date picker. */}
        <Dialog open={editSaleState.open} onOpenChange={open => setEditSaleState(prev => ({ ...prev, open }))}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sale: {editSaleState.sale?.transaction_reference}</DialogTitle>
              <DialogDescription>
                Update customer info, sale date, item quantity, unit price, or note.
              </DialogDescription>
            </DialogHeader>
            {editSaleState.editedFields && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveEditSale();
                }}
              >
                {/* --- MODIFIED: Layout to include date picker --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm py-4">
                  <div>
                    <Label htmlFor="edit_customer_name">Customer Name</Label>
                    <Input
                      id="edit_customer_name"
                      value={editSaleState.editedFields.customer_name}
                      onChange={e => handleEditFieldChange("customer_name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_customer_phone">Customer Phone</Label>
                    <Input
                      id="edit_customer_phone"
                      value={editSaleState.editedFields.customer_phone || ""}
                      onChange={e => handleEditFieldChange("customer_phone", e.target.value)}
                    />
                  </div>
                  {/* --- NEW: Sale Date Picker --- */}
                  <div>
                    <Label htmlFor="edit_sale_date">Sale Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="edit_sale_date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !editSaleState.editedFields.sale_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editSaleState.editedFields.sale_date ? (
                            format(editSaleState.editedFields.sale_date, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editSaleState.editedFields.sale_date}
                          onSelect={handleEditSaleDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="mb-3 flex items-center">
                  <span className="font-semibold mr-2">Total Amount:</span>
                  <span className="text-xl font-bold">{formatCurrency(editedTotalAmount)}</span>
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-3">Edit Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editSaleState.editedFields.sale_items.map((item, idx) => {
                      const orig = (editSaleState.sale?.sale_items ?? []).find(si => si.id === item.id);
                      const itemTotal = item.quantity * item.unit_sale_price;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {editSaleState.sale?.saleType === "External Sale" ? (
                              <Input
                                value={item.product_name ?? orig?.product_name ?? ""}
                                onChange={e =>
                                  handleEditSaleItemFieldChange(idx, "product_name", e.target.value)
                                }
                                required
                              />
                            ) : (
                              <>
                                {orig?.products?.name || "N/A"}
                                {orig?.products?.unique_reference
                                  ? ` (${orig.products.unique_reference})`
                                  : ""}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e =>
                                handleEditSaleItemFieldChange(idx, "quantity", Number(e.target.value))
                              }
                              required
                              className="min-w-[70px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unit_sale_price}
                              onChange={e =>
                                handleEditSaleItemFieldChange(idx, "unit_sale_price", Number(e.target.value))
                              }
                              required
                              className="min-w-[100px]"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{formatCurrency(itemTotal)}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.note ?? ""}
                              onChange={e =>
                                handleEditSaleItemFieldChange(idx, "note", e.target.value)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {editSaleState.error && (
                  <div className="text-red-700 mt-2">{editSaleState.error}</div>
                )}
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setEditSaleState({ open: false, sale: null, editedFields: null, saving: false, error: null })}>Cancel</Button>
                  <Button type="submit" disabled={editSaleState.saving}>
                    {editSaleState.saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}  