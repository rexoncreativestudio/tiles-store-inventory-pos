import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import UserManagementOverviewClient from './user-management-overview-client';

export default async function UserManagementPage() {
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
    redirect('/dashboard/overview');
  }

  const { data: usersRaw } = await supabase
    .from('users')
    .select('id, email, role, branch_id, branch(id, name)');

  const { data: branchesRaw } = await supabase
    .from('branches')
    .select('id, name');

  // Defensive: Ensure arrays, and ensure branch is not an array (should be object or null)
  const users = (usersRaw || []).map((u: any) => ({
    ...u,
    branch: Array.isArray(u.branch) ? u.branch[0] || null : u.branch,
  }));

  const branches = branchesRaw || [];

  return (
    <UserManagementOverviewClient initialUsers={users} initialBranches={branches} />
  );
}