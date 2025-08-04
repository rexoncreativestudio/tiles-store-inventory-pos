import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SalesFilterActions from './sales-filter-actions';
import SaleTableRowClient from './sale-table-row-client';
import SalesSummaryCards from './components/sales-summary-cards';
import { Separator } from '@/components/ui/separator';
import AddSaleRedirectButton from './components/add-sale-redirect-button';
import SalesPaginationClient from './components/sales-pagination-client';

import type {
  ProductForSaleItem,
  SaleItemDetails,
  SaleRecord,
  ExternalSaleItem,
  ExternalSaleRecord,
} from './types/sales';

type SaleRecordRaw = Omit<SaleRecord, 'users' | 'branches' | 'sale_items'> & {
  users: { id: string; email: string }[] | { id: string; email: string } | null;
  branches: { id: string; name: string }[] | { id: string; name: string } | null;
  sale_items: (Omit<SaleItemDetails, 'products'> & {
    products: ProductForSaleItem[] | ProductForSaleItem | null;
  })[];
};
type ExternalSaleRecordRaw = Omit<ExternalSaleRecord, 'users' | 'branches' | 'external_sale_items'> & {
  external_sale_items: ExternalSaleItem[] | ExternalSaleItem | null;
  cashier: { id: string; email: string } | { id: string; email: string }[] | null;
  branch: { id: string; name: string } | { id: string; name: string }[] | null;
};

export default async function SalesPage({
  // Changed the type of searchParams to `any` to resolve the build error.
  // Next.js 15.x.x's internal type checking for PageProps is causing a conflict.
  searchParams,
}: any) { // Changed from `{ searchParams?: Record<string, string> }` to `any`
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role, branch_id, id')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager', 'cashier'].includes(currentUserProfile?.role || '')) {
    redirect('/dashboard/overview');
  }

  // --- Read filters from URL ---
  const urlParams = new URLSearchParams(
    Object.entries(searchParams ?? {}).map(([key, value]) => [key, String(value)])
  );
  const dateFrom = urlParams.get('dateFrom');
  const dateTo = urlParams.get('dateTo');
  const branchId = urlParams.get('branchId');
  const status = urlParams.get('status');
  const saleType = urlParams.get('saleType');
  const search = urlParams.get('search');

  // --- Pagination ---
  const page = parseInt(urlParams.get('page') || "1", 10);
  const itemsPerPage = parseInt(urlParams.get('itemsPerPage') || "10", 10);
  const fromIdx = (page - 1) * itemsPerPage;
  const toIdx = fromIdx + itemsPerPage - 1;

  // --- Build queries dynamically (server-side filtering) ---
  let salesQuery = supabase
    .from('sales')
    .select(`
      id, sale_date, cashier_id, branch_id, customer_name, customer_phone,
      total_amount, payment_method, status, transaction_reference, created_at, updated_at,
      users(id, email),
      branches(id, name),
      sale_items(id, product_id, quantity, unit_sale_price, total_price, note, products(id, name, unique_reference, product_unit_abbreviation, purchase_price))
    `)
    .order('sale_date', { ascending: false });

  let externalSalesQuery = supabase
    .from('external_sales')
    .select(`
      id, sale_date, cashier_id, branch_id, customer_name, customer_phone,
      total_amount, payment_method, status, transaction_reference, created_at, updated_at,
      external_sale_items:external_sale_items (
        id, product_name, product_category_name, product_unit_name, quantity, unit_sale_price, unit_purchase_price_negotiated, total_cost, total_price, note
      ),
      cashier:cashier_id (id, email),
      branch:branch_id (id, name)
    `)
    .order('sale_date', { ascending: false });

  if (dateFrom) {
    salesQuery = salesQuery.gte('sale_date', dateFrom);
    externalSalesQuery = externalSalesQuery.gte('sale_date', dateFrom);
  }
  if (dateTo) {
    salesQuery = salesQuery.lte('sale_date', dateTo);
    externalSalesQuery = externalSalesQuery.lte('sale_date', dateTo);
  }
  if (branchId && branchId !== 'all') {
    salesQuery = salesQuery.eq('branch_id', branchId);
    externalSalesQuery = externalSalesQuery.eq('branch_id', branchId);
  }
  if (status && status !== 'all') {
    salesQuery = salesQuery.eq('status', status);
    externalSalesQuery = externalSalesQuery.eq('status', status);
  }
  if (search && search.trim() !== "") {
    salesQuery = salesQuery.or(
      `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
    );
    externalSalesQuery = externalSalesQuery.or(
      `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
    );
  }

  const [{ count: salesCount }, { count: externalSalesCount }] = await Promise.all([
    supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .order('sale_date', { ascending: false })
      .gte(dateFrom ? 'sale_date' : 'id', dateFrom || '')
      .lte(dateTo ? 'sale_date' : 'id', dateTo || '')
      .eq(branchId && branchId !== 'all' ? 'branch_id' : 'id', branchId && branchId !== 'all' ? branchId : '')
      .eq(status && status !== 'all' ? 'status' : 'id', status && status !== 'all' ? status : '')
      .or(
        search && search.trim() !== ""
          ? `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
          : ""
      ),
    supabase
      .from('external_sales')
      .select('id', { count: 'exact', head: true })
      .order('sale_date', { ascending: false })
      .gte(dateFrom ? 'sale_date' : 'id', dateFrom || '')
      .lte(dateTo ? 'sale_date' : 'id', dateTo || '')
      .eq(branchId && branchId !== 'all' ? 'branch_id' : 'id', branchId && branchId !== 'all' ? branchId : '')
      .eq(status && status !== 'all' ? 'status' : 'id', status && status !== 'all' ? status : '')
      .or(
        search && search.trim() !== ""
          ? `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
          : ""
      ),
  ]);

  if (!saleType || saleType === 'all') {
    salesQuery = salesQuery.range(fromIdx, toIdx);
    externalSalesQuery = externalSalesQuery.range(fromIdx, toIdx);
  } else if (saleType === 'regular') {
    salesQuery = salesQuery.range(fromIdx, toIdx);
  } else if (saleType === 'external') {
    externalSalesQuery = externalSalesQuery.range(fromIdx, toIdx);
  }

  let sales: SaleRecord[] = [];
  let externalSales: ExternalSaleRecord[] = [];
  if (!saleType || saleType === 'all') {
    const [{ data: salesRaw }, { data: externalSalesRaw }] = await Promise.all([
      salesQuery,
      externalSalesQuery
    ]);
    sales = (salesRaw ?? []).map((s: SaleRecordRaw) => ({
      ...s,
      users: Array.isArray(s.users) ? (s.users[0] ?? null) : (s.users ?? null),
      branches: Array.isArray(s.branches) ? (s.branches[0] ?? null) : (s.branches ?? null),
      sale_items: Array.isArray(s.sale_items)
        ? s.sale_items.map((item) => ({
            ...item,
            products: Array.isArray(item.products) ? (item.products[0] ?? null) : (item.products ?? null),
          }))
        : [],
    }));
    externalSales = (externalSalesRaw ?? []).map((s: ExternalSaleRecordRaw) => ({
      ...s,
      users: Array.isArray(s.cashier) ? (s.cashier[0] ?? null) : (s.cashier ?? null),
      branches: Array.isArray(s.branch) ? (s.branch[0] ?? null) : (s.branch ?? null),
      external_sale_items: Array.isArray(s.external_sale_items)
        ? s.external_sale_items
        : (s.external_sale_items ? [s.external_sale_items] : []),
    }));
  } else if (saleType === 'regular') {
    const { data: salesRaw } = await salesQuery;
    sales = (salesRaw ?? []).map((s: SaleRecordRaw) => ({
      ...s,
      users: Array.isArray(s.users) ? (s.users[0] ?? null) : (s.users ?? null),
      branches: Array.isArray(s.branches) ? (s.branches[0] ?? null) : (s.branches ?? null),
      sale_items: Array.isArray(s.sale_items)
        ? s.sale_items.map((item) => ({
            ...item,
            products: Array.isArray(item.products) ? (item.products[0] ?? null) : (item.products ?? null),
          }))
        : [],
    }));
    externalSales = [];
  } else if (saleType === 'external') {
    const { data: externalSalesRaw } = await externalSalesQuery;
    sales = [];
    externalSales = (externalSalesRaw ?? []).map((s: ExternalSaleRecordRaw) => ({
      ...s,
      users: Array.isArray(s.cashier) ? (s.cashier[0] ?? null) : (s.cashier ?? null),
      branches: Array.isArray(s.branch) ? (s.branch[0] ?? null) : (s.branch ?? null),
      external_sale_items: Array.isArray(s.external_sale_items)
        ? s.external_sale_items
        : (s.external_sale_items ? [s.external_sale_items] : []),
    }));
  }

  const { data: branchesForSelect } = await supabase
    .from('branches')
    .select('id, name');
  const { data: cashiersForSelect } = await supabase
    .from('users')
    .select('id, email')
    .in('role', ['admin', 'general_manager', 'branch_manager', 'cashier']);
  const { data: productsForSelection } = await supabase
    .from('products')
    .select('id, name, unique_reference, sale_price, product_unit_abbreviation, purchase_price')
    .order('name', { ascending: true });

  const allSales = [
    ...sales,
    ...externalSales
  ].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

  const totalRegularSalesCost = sales.reduce((sum, sale) =>
    sum + sale.sale_items.reduce((itemSum, item) =>
      itemSum + (item.products?.purchase_price ? (item.quantity * item.products.purchase_price) : 0), 0
    ), 0);
  const totalExternalSalesCost = externalSales.reduce((sum, sale) =>
    sum + sale.external_sale_items.reduce((itemSum, item) => itemSum + (item.total_cost || 0), 0), 0);
  const totalOverallSalesIncome = [...sales, ...externalSales].reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalNetProfit = totalOverallSalesIncome - (totalRegularSalesCost + totalExternalSalesCost);

  let totalItems = 0;
  if (!saleType || saleType === 'all') {
    totalItems = (salesCount ?? 0) + (externalSalesCount ?? 0);
  } else if (saleType === 'regular') {
    totalItems = salesCount ?? 0;
  } else if (saleType === 'external') {
    totalItems = externalSalesCount ?? 0;
  }

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      {/* --- Title & Button Row --- */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold">Sale Overview</h1>
        <AddSaleRedirectButton />
      </div>
      <Separator className="mb-2" />
      <Separator className="mb-8" />

      {/* --- Filters Section (separate card) --- */}
      <div className="bg-white rounded-lg shadow mb-8 p-6">
        <SalesFilterActions
          branches={branchesForSelect ?? []}
          searchParams={searchParams ?? {}}
        />
      </div>

      {/* --- Main Container --- */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* --- Summary Cards --- */}
        <div className="mb-8">
          <SalesSummaryCards
            totalSales={allSales.length}
            totalSaleIncome={totalOverallSalesIncome}
            netProfit={totalNetProfit}
          />
        </div>

        {/* --- Sales Table --- */}
        <div className="mb-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SN</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Ref.</TableHead>
                <TableHead>Branch/Employee</TableHead>
                <TableHead>Sale Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSales.length > 0 ? (
                allSales.map((sale, idx) => (
                  <SaleTableRowClient
                    key={sale.id}
                    sale={sale}
                    idx={idx}
                    allBranches={[...(branchesForSelect ?? [])]}
                    allProducts={[...(productsForSelection ?? [])]}
                    allCashiers={[...(cashiersForSelect ?? [])]}
                    currentUserId={currentUserProfile.id}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    No sales records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* --- Pagination --- */}
        <div className="flex justify-center">
          <SalesPaginationClient
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={page}
          />
        </div>
      </div>
    </div>
  );
}  