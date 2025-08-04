import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import ManagerOverviewClient from './components/manager-overview-client';
import {
  PendingAuditRecordForManager,
  WarehouseForManager,
  UserForManager,
} from './types';

export default async function StockManagerPage({
  // Changed the type of searchParams to `any` to resolve the build error.
  // Next.js 15.x.x's internal type checking for PageProps is causing a conflict.
  searchParams,
}: any) { // Changed from `{ searchParams?: { ... } }` to `any`
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

  if (
    profileError ||
    !currentUserProfile ||
    !['admin', 'general_manager', 'stock_manager', 'branch_manager'].includes(currentUserProfile.role || '')
  ) {
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id;
  const currentUserRole = currentUserProfile.role;

  const currentPage = parseInt(searchParams?.page || '1');
  const itemsPerPage = parseInt(searchParams?.limit || '10');
  const offset = (currentPage - 1) * itemsPerPage;

  // Corrected select: NO branch/branches
  let pendingAuditsQuery = supabase
    .from('pending_stock_audits')
    .select(
      `
      id, submission_date, warehouse_id, recorded_by_controller_id, status, audit_date,
      audited_by_manager_id, notes_from_manager, notes_from_controller, submission_details,
      created_at, updated_at,
      warehouses(id, name, location),
      recorded_by_controller_user:users!pending_stock_audits_recorded_by_controller_id_fkey(id, email),
      audited_by_manager_user:users!pending_stock_audits_audited_by_manager_id_fkey(id, email)
    `,
      { count: 'exact' }
    )
    .order('submission_date', { ascending: false });

  if (searchParams?.status && searchParams.status !== 'all') {
    pendingAuditsQuery = pendingAuditsQuery.eq('status', searchParams.status);
  }
  if (searchParams?.warehouse && searchParams.warehouse !== 'all') {
    pendingAuditsQuery = pendingAuditsQuery.eq('warehouse_id', searchParams.warehouse);
  }
  if (searchParams?.controller && searchParams.controller !== 'all') {
    pendingAuditsQuery = pendingAuditsQuery.eq('recorded_by_controller_id', searchParams.controller);
  }
  if (searchParams?.dateFrom) {
    pendingAuditsQuery = pendingAuditsQuery.gte('submission_date', searchParams.dateFrom);
  }
  if (searchParams?.dateTo) {
    const dateTo = new Date(searchParams.dateTo);
    dateTo.setDate(dateTo.getDate() + 1);
    pendingAuditsQuery = pendingAuditsQuery.lt('submission_date', dateTo.toISOString().split('T')[0]);
  }
  if (searchParams?.query) {
    pendingAuditsQuery = pendingAuditsQuery.or(
      `notes_from_controller.ilike.%${searchParams.query}%,notes_from_manager.ilike.%${searchParams.query}%`
    );
  }

  const { data, error, count } = await pendingAuditsQuery
    .range(offset, offset + itemsPerPage - 1);

  if (error) {
    console.error("Error fetching audits:", error);
  }

  // Ensure all joins are objects, not arrays (Supabase bug workaround)
  const pendingAudits: PendingAuditRecordForManager[] = Array.isArray(data)
    ? data.map((item) => ({
        ...item,
        warehouses: Array.isArray(item.warehouses) ? (item.warehouses[0] ?? null) : item.warehouses ?? null,
        recorded_by_controller_user: Array.isArray(item.recorded_by_controller_user)
          ? (item.recorded_by_controller_user[0] ?? null)
          : item.recorded_by_controller_user ?? null,
        audited_by_manager_user: Array.isArray(item.audited_by_manager_user)
          ? (item.audited_by_manager_user[0] ?? null)
          : item.audited_by_manager_user ?? null,
      }))
    : [];
  const totalAuditsCount: number = typeof count === 'number' ? count : 0;

  // Fetch filter options 
  const { data: warehousesData, error: warehousesError } = await supabase
    .from('warehouses')
    .select('id, name, location')
    .order('name');

  if (warehousesError) {
    console.error("Error fetching warehouses:", warehousesError);
  }

  const warehousesForFilter: WarehouseForManager[] = Array.isArray(warehousesData)
    ? warehousesData as WarehouseForManager[]
    : [];

  const { data: controllersData, error: controllersError } = await supabase
    .from('users')
    .select('id, email')
    .eq('role', 'stock_controller')
    .order('email');

  if (controllersError) {
    console.error("Error fetching controllers:", controllersError);
  }

  const controllersForFilter: UserForManager[] = Array.isArray(controllersData)
    ? controllersData as UserForManager[]
    : [];

  return (
    <div className="bg-gray-50 min-h-screen px-2 sm:px-4 lg:px-12 xl:px-20 py-2 sm:py-6">
      <div className="max-w-[1600px] mx-auto w-full">
        <ManagerOverviewClient
          initialPendingAudits={pendingAudits}
          totalItems={totalAuditsCount}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          warehouses={warehousesForFilter}
          controllers={controllersForFilter}
          currentUserRole={currentUserRole}
          currentManagerId={currentUserId}
          currentUserBranchId={null} // Assuming this is not relevant for this page's logic
        />
      </div>
    </div>
  );
}
 