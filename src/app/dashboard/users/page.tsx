// src/app/dashboard/users/page.tsx
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
import UserManagementActions from './user-management-actions';

// Define the type for a user with their associated branch
type UserWithBranch = {
  id: string;
  email: string;
  role: 'admin' | 'general_manager' | 'branch_manager' | 'cashier';
  branch_id: string | null; // Include branch_id as it's part of the user object
  branches: { id: string; name: string } | null; // Supabase returns single relation as object, not array
};

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
    console.error("Access Denied: Non-admin trying to access User Management or profile fetch failed.");
    redirect('/dashboard/overview');
  }

  // Fetch all users for display
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, branch_id, branches(id, name)') // Ensure branch_id is selected
    .returns<UserWithBranch[]>(); // Cast to the defined type

  if (usersError) {
    console.error("Error fetching users:", usersError.message);
    return <p className="text-red-500">Error loading users: {usersError.message}</p>;
  }

  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id, name');

  if (branchesError) {
    console.error("Error fetching branches:", branchesError.message);
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <UserManagementActions branches={branches || []} />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="w-[50px]">SN</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Branch</TableHead><TableHead className="text-right w-[150px]">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((u, idx) => (
                <TableRow key={u.id}><TableCell>{idx + 1}</TableCell><TableCell className="font-medium">{u.email}</TableCell><TableCell>{u.role}</TableCell><TableCell>{u.branches?.name || 'N/A'}</TableCell><TableCell className="text-right">
                    <UserManagementActions
                      userToEdit={u}
                      branches={branches || []}
                    />
                  </TableCell></TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}