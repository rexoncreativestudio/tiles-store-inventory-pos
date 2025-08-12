import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import SalesFilterActions from './sales-filter-actions';
import SaleTableRowClient from './sale-table-row-client';
import SalesSummaryCards from './components/sales-summary-cards';
import PaginationWrapper from './components/pagination-wrapper';
import { Separator } from '@/components/ui/separator';

// Dynamic import for mobile accordion client component (client only)
import SalesMobileAccordionClient from "./components/sales-mobile-accordion-dynamic";

import type {
  ProductForSaleItem,
  SaleItemDetails,
  SaleRecord,
  ExternalSaleItem,
  ExternalSaleRecord,
} from './types/sales';

// --- RAW TYPES ---
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

function isFilterActive(params: Record<string, string | null>): boolean {
  return !!(
    (params.dateFrom && params.dateFrom !== '') ||
    (params.dateTo && params.dateTo !== '') ||
    (params.branchId && params.branchId !== '' && params.branchId !== 'all') ||
    (params.status && params.status !== '' && params.status !== 'all') ||
    (params.saleType && params.saleType !== '' && params.saleType !== 'all') ||
    (params.search && params.search.trim() !== '')
  );
}

export default async function SalesPage({ searchParams }: any) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users').select('role, branch_id, id').eq('id', user.id).single();
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

  // --- Branch manager scope filtering ---
  let effectiveBranchId = branchId;
  if (currentUserProfile?.role === 'branch_manager') {
    effectiveBranchId = currentUserProfile.branch_id;
  }

  // --- Determine if filter is active ---
  const filterActive: boolean = isFilterActive({
    dateFrom, dateTo, branchId, status, saleType, search,
  });

  // --- Queries for paginated table data ---
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

  // --- Queries for summary cards data (unpaginated, all filtered) ---
  let salesSummaryQuery = supabase
    .from('sales')
    .select(`
      id, sale_date, cashier_id, branch_id, customer_name, customer_phone,
      total_amount, payment_method, status, transaction_reference, created_at, updated_at,
      users(id, email),
      branches(id, name),
      sale_items(id, product_id, quantity, unit_sale_price, total_price, note, products(id, name, unique_reference, product_unit_abbreviation, purchase_price))
    `)
    .order('sale_date', { ascending: false });

  let externalSalesSummaryQuery = supabase
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

  // --- Apply filters to all queries ---
  if (dateFrom) {
    salesQuery = salesQuery.gte('sale_date', dateFrom);
    externalSalesQuery = externalSalesQuery.gte('sale_date', dateFrom);
    salesSummaryQuery = salesSummaryQuery.gte('sale_date', dateFrom);
    externalSalesSummaryQuery = externalSalesSummaryQuery.gte('sale_date', dateFrom);
  }
  if (dateTo) {
    salesQuery = salesQuery.lte('sale_date', dateTo);
    externalSalesQuery = externalSalesQuery.lte('sale_date', dateTo);
    salesSummaryQuery = salesSummaryQuery.lte('sale_date', dateTo);
    externalSalesSummaryQuery = externalSalesSummaryQuery.lte('sale_date', dateTo);
  }
  if (effectiveBranchId && effectiveBranchId !== 'all') {
    salesQuery = salesQuery.eq('branch_id', effectiveBranchId);
    externalSalesQuery = externalSalesQuery.eq('branch_id', effectiveBranchId);
    salesSummaryQuery = salesSummaryQuery.eq('branch_id', effectiveBranchId);
    externalSalesSummaryQuery = externalSalesSummaryQuery.eq('branch_id', effectiveBranchId);
  }

  // --- Status filter (special case for completed_no_purchase) ---
  let filterByCompletedNoPurchase = false;
  if (status && status !== 'all') {
    if (status === 'completed_no_purchase') {
      externalSalesQuery = externalSalesQuery.in('status', ['completed', 'held']);
      externalSalesSummaryQuery = externalSalesSummaryQuery.in('status', ['completed', 'held']);
      filterByCompletedNoPurchase = true;
    } else {
      salesQuery = salesQuery.eq('status', status);
      externalSalesQuery = externalSalesQuery.eq('status', status);
      salesSummaryQuery = salesSummaryQuery.eq('status', status);
      externalSalesSummaryQuery = externalSalesSummaryQuery.eq('status', status);
    }
  }
  if (search && search.trim() !== "") {
    salesQuery = salesQuery.or(
      `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
    );
    externalSalesQuery = externalSalesQuery.or(
      `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
    );
    salesSummaryQuery = salesSummaryQuery.or(
      `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
    );
    externalSalesSummaryQuery = externalSalesSummaryQuery.or(
      `customer_name.ilike.%${search.trim()}%,transaction_reference.ilike.%${search.trim()}%`
    );
  }

  // --- Table pagination: ONLY if filterActive is false ---
  if (!filterActive) {
    if (!saleType || saleType === 'all') {
      salesQuery = salesQuery.range(fromIdx, toIdx);
      externalSalesQuery = externalSalesQuery.range(fromIdx, toIdx);
    } else if (saleType === 'regular') {
      salesQuery = salesQuery.range(fromIdx, toIdx);
    } else if (saleType === 'external') {
      externalSalesQuery = externalSalesQuery.range(fromIdx, toIdx);
    }
  }

  // --- Fetch summary (unpaginated, filtered) data for summary cards ---
  let summarySales: SaleRecord[] = [];
  let summaryExternalSales: ExternalSaleRecord[] = [];

  if (!saleType || saleType === 'all') {
    const [{ data: summarySalesRaw }, { data: summaryExternalSalesRaw }] = await Promise.all([
      salesSummaryQuery,
      externalSalesSummaryQuery,
    ]);
    summarySales = (summarySalesRaw ?? []).map((s: SaleRecordRaw) => ({
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
    summaryExternalSales = (summaryExternalSalesRaw ?? []).map((s: ExternalSaleRecordRaw) => ({
      ...s,
      users: Array.isArray(s.cashier) ? (s.cashier[0] ?? null) : (s.cashier ?? null),
      branches: Array.isArray(s.branch) ? (s.branch[0] ?? null) : (s.branch ?? null),
      external_sale_items: Array.isArray(s.external_sale_items)
        ? s.external_sale_items
        : (s.external_sale_items ? [s.external_sale_items] : []),
    }));

    if (filterByCompletedNoPurchase) {
      summaryExternalSales = summaryExternalSales.filter(sale =>
        sale.external_sale_items.some(item => item.unit_purchase_price_negotiated === 0)
      );
    }
  } else if (saleType === 'regular') {
    const { data: summarySalesRaw } = await salesSummaryQuery;
    summarySales = (summarySalesRaw ?? []).map((s: SaleRecordRaw) => ({
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
    summaryExternalSales = [];
  } else if (saleType === 'external') {
    const { data: summaryExternalSalesRaw } = await externalSalesSummaryQuery;
    summarySales = [];
    summaryExternalSales = (summaryExternalSalesRaw ?? []).map((s: ExternalSaleRecordRaw) => ({
      ...s,
      users: Array.isArray(s.cashier) ? (s.cashier[0] ?? null) : (s.cashier ?? null),
      branches: Array.isArray(s.branch) ? (s.branch[0] ?? null) : (s.branch ?? null),
      external_sale_items: Array.isArray(s.external_sale_items)
        ? s.external_sale_items
        : (s.external_sale_items ? [s.external_sale_items] : []),
    }));

    if (filterByCompletedNoPurchase) {
      summaryExternalSales = summaryExternalSales.filter(sale =>
        sale.external_sale_items.some(item => item.unit_purchase_price_negotiated === 0)
      );
    }
  }

  // --- All summary sales (all filtered, not paginated) ---
  const allSummarySales = [
    ...summarySales,
    ...summaryExternalSales
  ].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

  // --- Summary card calculations ---
  const totalRegularSalesCost = summarySales.reduce((sum, sale) =>
    sum + sale.sale_items.reduce((itemSum, item) =>
      itemSum + (item.products?.purchase_price ? (item.quantity * item.products.purchase_price) : 0), 0
    ), 0);
  const totalExternalSalesCost = summaryExternalSales.reduce((sum, sale) =>
    sum + sale.external_sale_items.reduce((itemSum, item) => itemSum + (item.total_cost || 0), 0), 0);
  const totalOverallSalesIncome = [...summarySales, ...summaryExternalSales].reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalNetProfit = totalOverallSalesIncome - (totalRegularSalesCost + totalExternalSalesCost);

  // --- Fetch paginated or filtered data for table display ---
  let sales: SaleRecord[] = [];
  let externalSales: ExternalSaleRecord[] = [];
  if (!saleType || saleType === 'all') {
    const [{ data: salesRaw }, { data: externalSalesRaw }] = await Promise.all([
      salesQuery,
      externalSalesQuery,
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

    if (filterByCompletedNoPurchase) {
      externalSales = externalSales.filter(sale =>
        sale.external_sale_items.some(item => item.unit_purchase_price_negotiated === 0)
      );
    }
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

    if (filterByCompletedNoPurchase) {
      externalSales = externalSales.filter(sale =>
        sale.external_sale_items.some(item => item.unit_purchase_price_negotiated === 0)
      );
    }
  }

  // --- Other selects ---
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

  // --- All sales for table (paginated or all filtered) ---
  const allSales = [
    ...sales,
    ...externalSales
  ].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

  // --- totalItems for pagination (from summary) ---
  let totalItems = allSummarySales.length;
  if (!filterActive) {
    const [{ count: regularCount }, { count: externalCount }] = await Promise.all([
      supabase.from('sales').select('id', { count: 'exact', head: true }),
      supabase.from('external_sales').select('id', { count: 'exact', head: true }),
    ]);
    totalItems = (regularCount ?? 0) + (externalCount ?? 0);
  }

  return (
    <div className="bg-gradient-to-br from-gray-100 via-white to-gray-200 min-h-screen p-0 sm:p-8">
      {/* --- Title Row --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2 px-2 sm:px-4 pt-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight text-center sm:text-left">
          Sale Overview
        </h1>
      </div>
      <Separator className="mb-2" />
      <Separator className="mb-4 sm:mb-8" />

      {/* --- Filters Section --- */}
      <section className="mb-4 sm:mb-8">
        <div className="hidden sm:block bg-white rounded-xl shadow-md px-6 py-6 mb-4">
          <SalesFilterActions
            branches={branchesForSelect ?? []}
            searchParams={searchParams ?? {}}
          />
        </div>
        <div className="sm:hidden px-2">
          <SalesFilterActions
            branches={branchesForSelect ?? []}
            searchParams={searchParams ?? {}}
            mobileMode={true}
          />
        </div>
      </section>

      {/* --- Summary Cards Section --- */}
      <section className="mb-6">
        <div className="hidden sm:block w-full">
          <SalesSummaryCards
            totalSales={allSummarySales.length}
            totalSaleIncome={totalOverallSalesIncome}
            netProfit={totalNetProfit}
          />
        </div>
        <div className="sm:hidden w-full">
          <SalesSummaryCards
            totalSales={allSummarySales.length}
            totalSaleIncome={totalOverallSalesIncome}
            netProfit={totalNetProfit}
            mobileMode={true}
          />
        </div>
      </section>

      {/* --- Sales List/Card/Accordion --- */}
      <section className="mb-6">
        {/* MOBILE: Cards/Accordion with SN and functional actions */}
        <div className="sm:hidden space-y-4 px-2">
          {allSales.length > 0 ? (
            <SalesMobileAccordionClient
              allSales={allSales}
              page={page}
              itemsPerPage={itemsPerPage}
              branchesForSelect={branchesForSelect ?? []}
              productsForSelection={productsForSelection ?? []}
              cashiersForSelect={cashiersForSelect ?? []}
              currentUserId={currentUserProfile.id}
            />
          ) : (
            <div className="bg-white rounded-lg shadow px-3 py-6 text-center text-gray-500">
              No sales records found.
            </div>
          )}
          {/* Pagination for mobile */}
          {!filterActive && (
            <div className="flex justify-center py-6">
              <PaginationWrapper
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={page}
              />
            </div>
          )}
        </div>
        {/* DESKTOP: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <section className="bg-white rounded-xl shadow-lg p-0 sm:p-8">
            <table className="min-w-full w-full table-auto rounded-md overflow-hidden">
              <thead>
                <tr>
                  <th className="w-[5%] text-left p-3">SN</th>
                  <th className="w-[13%] text-left p-3">Date</th>
                  <th className="w-[13%] text-left p-3">Ref.</th>
                  <th className="w-[12%] text-left p-3">Branch</th>
                  <th className="w-[10%] text-left p-3">Sale Type</th>
                  <th className="w-[10%] text-left p-3">Customer</th>
                  <th className="w-[12%] text-left p-3">Amount</th>
                  <th className="w-[10%] text-left p-3">Status</th>
                  <th className="w-[15%] text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSales.length > 0 ? (
                  allSales.map((sale, idx) => (
                    <SaleTableRowClient
                      key={sale.id}
                      sale={sale}
                      idx={(page - 1) * itemsPerPage + idx}
                      allBranches={[...(branchesForSelect ?? [])]}
                      allProducts={[...(productsForSelection ?? [])]}
                      allCashiers={[...(cashiersForSelect ?? [])]}
                      currentUserId={currentUserProfile.id}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="h-24 text-center text-gray-500">
                      No sales records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {!filterActive && (
              <div className="flex justify-center pb-4 sm:pb-8">
                <PaginationWrapper
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  currentPage={page}
                />
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}   