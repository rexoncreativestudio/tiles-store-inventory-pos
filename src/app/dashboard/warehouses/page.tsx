import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import WarehouseManagementPageClient from './components/warehouse-management-page-client';

// --- Type Definitions (aligned with database schema: NO branch_id on WarehouseRecord) ---
type WarehouseRecord = {
  id: string;
  name: string;
  location: string | null;
};

export default async function WarehouseManagementPage() {
  // SERVER ONLY CODE HERE
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access Warehouse Management.");
    redirect('/dashboard/overview');
  }

  const { data: warehouses, error: warehousesError } = await supabase
    .from('warehouses')
    .select(`id, name, location`)
    .order('name', { ascending: true })
    .returns<WarehouseRecord[]>();

  if (warehousesError) {
    console.error("Error fetching warehouses:", warehousesError.message);
  }

  return (
    <WarehouseManagementPageClient initialWarehouses={warehouses || []} />
  );
}