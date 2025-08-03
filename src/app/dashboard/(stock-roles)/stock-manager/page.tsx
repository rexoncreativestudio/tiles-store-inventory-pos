import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Separator } from '@/components/ui/separator';
import ManagerAuditTable from './components/manager-overview-client';
import {
  PendingAuditRecordForManager,
  WarehouseForManager,
} from './types';

export default async function StockManagerPage({
  searchParams,
}: {
  searchParams?: {
    page?: string;
    limit?: string;
    warehouse?: string;
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
    .select('id, email, role, branch_id')
    .eq('id', user.id)
    .single();

  if (profileError || !currentUserProfile || !['admin', 'general_manager', 'stock_manager', 'branch_manager'].includes(currentUserProfile.role || '')) {
    redirect('/dashboard/overview');
  }

  const currentUserId = currentUserProfile.id;
  const currentUserRole = currentUserProfile.role;
  const currentUserBranchId = currentUserProfile.branch_id;

  const currentPage = parseInt(searchParams?.page || '1');
  const itemsPerPage = parseInt(searchParams?.limit || '10');
  const offset = (currentPage - 1) * itemsPerPage;

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

  if (currentUserRole === 'stock_manager' || currentUserRole === 'branch_manager') {
    if (currentUserBranchId) {
      const accessibleControllerIds = (await supabase
        .from('users')
        .select('id')
        .eq('branch_id', currentUserBranchId)
        .returns<Array<{ id: string }>>()
      ).data?.map(u => u.id) || [];
      pendingAuditsQuery = pendingAuditsQuery.in('recorded_by_controller_id', accessibleControllerIds);
    } else {
      pendingAuditsQuery = pendingAuditsQuery.eq('recorded_by_controller_id', '00000000-0000-0000-0000-000000000000');
    }
  }

  // Only warehouse and date range filter
  if (searchParams?.warehouse && searchParams.warehouse !== 'all') {
    pendingAuditsQuery = pendingAuditsQuery.eq('warehouse_id', searchParams.warehouse);
  }
  if (searchParams?.dateFrom) {
    pendingAuditsQuery = pendingAuditsQuery.gte('submission_date', searchParams.dateFrom);
  }
  if (searchParams?.dateTo) {
    pendingAuditsQuery = pendingAuditsQuery.lte('submission_date', searchParams.dateTo);
  }

  const { data: pendingAudits, count: totalAuditsCount } = await pendingAuditsQuery
    .range(offset, offset + itemsPerPage - 1)
    .returns<PendingAuditRecordForManager[]>();

  const warehousesForFilterQuery = supabase
    .from('warehouses')
    .select('id, name, location')
    .order('name', { ascending: true });

  const { data: warehousesForFilter } = await warehousesForFilterQuery.returns<WarehouseForManager[]>();

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Stock Manager Panel</h1>
      <Separator className="mb-6" />
      <ManagerAuditTable
        initialPendingAudits={pendingAudits || []}
        totalItems={totalAuditsCount || 0}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        warehouses={warehousesForFilter || []}
        currentUserRole={currentUserRole}
        currentManagerId={currentUserId}
        currentUserBranchId={currentUserBranchId}
      />
    </div>
  );
}    