// src/app/dashboard/branches/page.tsx
// Ensure this file is located at: src/app/dashboard/branches/page.tsx

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
import BranchManagementActions from './branch-management-actions'; 

export default async function BranchManagementPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Fetch current user's role to enforce admin access on server-side
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || currentUserProfile?.role !== 'admin') {
    console.error("Access Denied: Non-admin trying to access Branch Management or profile fetch failed.");
    redirect('/dashboard/overview'); // Redirect to overview for unauthorized access
  }

  // Fetch all branches for display
  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id, name, location, created_at, updated_at');

  if (branchesError) {
    console.error("Error fetching branches:", branchesError.message);
    return <p className="text-red-500">Error loading branches: {branchesError.message}</p>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Branch Management</h1>
        <BranchManagementActions />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches && branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.location || 'N/A'}</TableCell>
                  <TableCell>{new Date(branch.created_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(branch.updated_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <BranchManagementActions branchToEdit={branch} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No branches found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}