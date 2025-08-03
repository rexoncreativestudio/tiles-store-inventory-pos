import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import ControllerOverviewClient from './components/controller-overview-client';
import {
  WarehouseForController,
  PendingAuditRecord,
  ProductCategory
} from './types';

export default async function StockControllerPage({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    limit?: string;
    status?: string;
    query?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  // Redirect if user profile has errors or does not have the required role
  if (
    profileError ||
    !currentUserProfile ||
    !['admin', 'general_manager', 'branch_manager', 'stock_controller'].includes(currentUserProfile.role || '')
  ) {
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id;
  const currentUserRole = currentUserProfile.role;

  // Fetch warehouses and categories
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select(`id, name, location`)
    .order('name', { ascending: true })
    .returns<WarehouseForController[]>();

  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, unit_abbreviation, description')
    .order('name', { ascending: true })
    .returns<ProductCategory[]>();

  // Pagination setup
  const currentPage = parseInt(searchParams?.page || '1');
  const itemsPerPage = parseInt(searchParams?.limit || '10');
  const offset = (currentPage - 1) * itemsPerPage;

  // Base query for pending audits
  let pendingAuditsQuery = supabase
    .from('pending_stock_audits')
    .select(`
      id, submission_date, warehouse_id, recorded_by_controller_id, status, audit_date,
      audited_by_manager_id, notes_from_manager, notes_from_controller, submission_details, created_at, updated_at,
      warehouses(id, name, location),
      recorded_by_controller_user:users!pending_stock_audits_recorded_by_controller_id_fkey(id, email),
      audited_by_manager_user:users!pending_stock_audits_audited_by_manager_id_fkey(id, email)
    `, { count: 'exact' })
    .order('submission_date', { ascending: false });

  // Apply role-based filter
  if (currentUserRole === 'stock_controller') {
    pendingAuditsQuery = pendingAuditsQuery.eq('recorded_by_controller_id', currentUserId);
  }
  
  // Apply status filter from search params
  if (searchParams?.status && searchParams.status !== 'all') {
    pendingAuditsQuery = pendingAuditsQuery.eq('status', searchParams.status);
  }

  // Apply date range filters from search params
  if (searchParams?.dateFrom) {
    pendingAuditsQuery = pendingAuditsQuery.gte('submission_date', searchParams.dateFrom);
  }
  if (searchParams?.dateTo) {
    // Add 1 day to the 'to' date to make the range inclusive
    const dateTo = new Date(searchParams.dateTo);
    dateTo.setDate(dateTo.getDate() + 1);
    pendingAuditsQuery = pendingAuditsQuery.lt('submission_date', dateTo.toISOString().split('T')[0]);
  }
  
  // Note: Searching by a text 'query' on a related table (warehouses) or inside a JSONB column
  // is more complex and may require a database function (RPC call) for efficiency.
  // For this implementation, we will filter by warehouse name on the client side if needed,
  // or you could implement an RPC call for server-side search.

  // Execute query and get data
  const { data: pendingAudits, count: totalAuditsCount } = await pendingAuditsQuery
    .range(offset, offset + itemsPerPage - 1)
    .returns<PendingAuditRecord[]>();

  return (
    // Removed padding from here, client component will handle it
    <div>
      <ControllerOverviewClient
        initialPendingAudits={pendingAudits || []}
        totalItems={totalAuditsCount || 0}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        warehouses={warehouses || []}
        allCategories={allCategories || []}
        recordedByUserId={currentUserId}
      />
    </div>
  );
} 
