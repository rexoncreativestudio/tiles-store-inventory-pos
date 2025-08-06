"use client";

import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserManagementActions from './user-management-actions';
import { toast } from 'sonner';
import { supabaseClient } from '@/lib/supabase/client';

type UserWithBranch = {
  id: string;
  email: string;
  role: 'admin' | 'general_manager' | 'branch_manager' | 'cashier' | 'stock_controller' | 'stock_manager';
  branch_id: string | null;
  branch: { id: string; name: string } | null;
};

type Branch = { id: string; name: string };

interface Props {
  initialUsers: UserWithBranch[];
  initialBranches: Branch[];
}

export default function UserManagementOverviewClient({ initialUsers, initialBranches }: Props) {
  const [users, setUsers] = useState<UserWithBranch[]>(initialUsers || []);
  const [branches, setBranches] = useState<Branch[]>(initialBranches || []);

  const fetchUsersAndBranches = useCallback(async () => {
    const { data: usersData, error: usersError } = await supabaseClient
      .from('users')
      .select('id, email, role, branch_id');
    const { data: branchesData, error: branchesError } = await supabaseClient
      .from('branches')
      .select('id, name');

    if (usersError) {
      toast.error("Error loading users", { description: usersError.message });
      setUsers([]);
      return;
    }

    if (branchesError) {
      toast.error("Error loading branches", { description: branchesError.message });
      setBranches([]);
      return;
    }

    // Merge users and branches manually
    const usersWithBranch = (usersData || []).map((u: any) => ({
      ...u,
      branch: (branchesData || []).find((b: any) => b.id === u.branch_id) || null,
    }));

    setUsers(usersWithBranch as UserWithBranch[]);
    setBranches(branchesData || []);
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <UserManagementActions branches={branches} onUserChanged={fetchUsersAndBranches} />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">SN</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="w-40 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((u, idx) => (
                <TableRow key={u.id} className="align-middle">
                  <TableCell className="text-center">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                  <TableCell>{u.branch?.name || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-2">
                      <UserManagementActions
                        userToEdit={u}
                        branches={branches}
                        onUserChanged={fetchUsersAndBranches}
                      />
                    </div>
                  </TableCell>
                </TableRow>
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