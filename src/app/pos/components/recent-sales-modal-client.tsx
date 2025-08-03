"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { Printer, Eye, Loader2, CalendarIcon, ShoppingCart, ExternalLink } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
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

// --- Type Definitions ---
type SaleItemDetailsForRecentSales = {
  id: string;
  product_id?: string;
  quantity: number;
  unit_sale_price: number;
  total_price: number;
  note: string | null;
  products?: {
    id: string;
    name: string;
    unique_reference: string;
    product_unit_abbreviation: string | null;
    purchase_price?: number;
  } | null;
  product_name?: string;
  product_category_name?: string;
  product_unit_name?: string;
  unit_purchase_price_negotiated?: number;
  total_cost?: number;
};

type UserForSelect = {
  id: string;
  email: string;
};

type SaleRecordForRecentSales = {
  id: string;
  sale_date: string;
  cashier_id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_method: string;
  status: 'completed' | 'held';
  transaction_reference: string;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string;
    role?: string;
  } | null;
  branches: {
    id: string;
    name: string;
  } | null;
  sale_items: SaleItemDetailsForRecentSales[];
  saleType: "Sale" | "External Sale";
};

interface RecentSalesModalClientProps {
  initialRecentSales?: SaleRecordForRecentSales[];
  isOpen: boolean;
  onClose: () => void;
  currentCashierId: string;
  currentUserRole: string;
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

export default function RecentSalesModalClient({
  initialRecentSales = [],
  isOpen,
  onClose,
  currentCashierId,
  currentUserRole
}: RecentSalesModalClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isSaleDetailsDialogOpen, setIsSaleDetailsDialogOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleRecordForRecentSales | null>(null);

  const [allSales, setAllSales] = useState<SaleRecordForRecentSales[]>(initialRecentSales);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    async function fetchAllSales() {
      try {
        // Normal sales
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
          .limit(20);

        if (salesError) {
          setError(salesError.message);
          setLoading(false);
          return;
        }

        // External sales
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
          .limit(20);

        if (externalSalesError) {
          setError(externalSalesError.message);
          setLoading(false);
          return;
        }

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
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    }
    fetchAllSales();
  }, [isOpen]);

  const canFilterByCashier = ["admin", "general_manager", "branch_manager"].includes(currentUserRole);

  const cashierOptions = useMemo(() => {
    const uniqueIds = Array.from(
      new Set(allSales.map(s => s.users?.id).filter(Boolean))
    );
    return uniqueIds.map(cashierId => {
      const cashier = allSales.find(s => s.users?.id === cashierId)?.users;
      return cashier ? { id: cashier.id, email: cashier.email } : undefined;
    }).filter(Boolean) as UserForSelect[];
  }, [allSales]);

  const filteredSales = useMemo(() => {
    let salesToDisplay = allSales;

    if (canFilterByCashier) {
      if (selectedCashier !== 'all') {
        salesToDisplay = salesToDisplay.filter(sale => sale.cashier_id === selectedCashier);
      }
    } else {
      salesToDisplay = salesToDisplay.filter(sale => sale.cashier_id === currentCashierId);
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

    return salesToDisplay;
  }, [
    allSales,
    dateFrom,
    dateTo,
    searchQuery,
    selectedCashier,
    selectedStatus,
    currentCashierId,
    canFilterByCashier
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
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery('');
    setSelectedCashier('all');
    setSelectedStatus('all');
  };

  const getStatusColorClass = (status: SaleRecordForRecentSales["status"]) => {
    switch (status) {
      case 'completed': return 'text-green-600 font-medium';
      case 'held': return 'text-yellow-600 font-medium';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1400px] max-h-[98vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recent Sales Overview</DialogTitle>
          <DialogDescription>
            Review and filter your latest sales transactions.
          </DialogDescription>
        </DialogHeader>
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
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="grid gap-1 flex-grow">
            <Label htmlFor="search_sales">Search</Label>
            <Input
              id="search_sales"
              placeholder="Ref, Customer, Cashier Email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="date_from_sales">Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="date_to_sales">Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          {canFilterByCashier && (
            <div className="grid gap-1">
              <Label htmlFor="cashier_sales_filter">Cashier</Label>
              <Select onValueChange={setSelectedCashier} value={selectedCashier}>
                <SelectTrigger className="w-[180px]" id="cashier_sales_filter">
                  <SelectValue placeholder="All Cashiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cashiers</SelectItem>
                  {cashierOptions.map(cashier => (
                    <SelectItem key={cashier.id} value={cashier.id}>{cashier.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1">
            <Label htmlFor="status_sales_filter">Status</Label>
            <Select onValueChange={setSelectedStatus} value={selectedStatus}>
              <SelectTrigger className="w-[180px]" id="status_sales_filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="held">Held</SelectItem> 
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleResetFilters} variant="outline" className="self-end">Reset</Button>
        </div>
        {/* Table with scroll */}
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
                  <TableHead>Cashier</TableHead>
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
                      <TableCell>{sale.users?.email || 'N/A'}</TableCell>
                      <TableCell>{sale.customer_name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <span className={getStatusColorClass(sale.status)}>
                          {sale.status.replace("_", " ").toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(sale)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" /> View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReprintReceipt(sale.transaction_reference, sale.saleType)}
                          title="Reprint Receipt"
                          className="ml-2"
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
                      {selectedSaleDetails.saleType === "External Sale" && (
                        <TableHead className="text-right">Purchase Price</TableHead>
                      )}
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
                          {selectedSaleDetails.saleType === "External Sale" && (
                            <TableCell className="text-right">{formatCurrency(item.unit_purchase_price_negotiated ?? 0)}</TableCell>
                          )}
                          <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                          <TableCell>{item.note || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={selectedSaleDetails.saleType === "External Sale" ? 7 : 6} className="h-16 text-center">No items found for this sale.</TableCell>
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
      </DialogContent>
    </Dialog>
  );
} 