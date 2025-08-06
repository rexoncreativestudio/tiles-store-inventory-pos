"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BranchManagementActions from "./branch-management-actions";

type BranchType = {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<BranchType[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      redirect("/");
      return;
    }
    const { data: currentUserProfile, error: profileFetchError } = await supabaseClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileFetchError || currentUserProfile?.role !== "admin") {
      setProfileError("Access Denied: Non-admin trying to access Branch Management or profile fetch failed.");
      redirect("/dashboard/overview");
      return;
    }

    const { data: branchesData, error: branchesError } = await supabaseClient
      .from("branches")
      .select("id, name, location, created_at, updated_at");

    if (branchesError) {
      setProfileError("Error loading branches: " + branchesError.message);
      setBranches([]);
    } else {
      setBranches(branchesData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  if (profileError) {
    return <p className="text-red-500">{profileError}</p>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Branch Management</h1>
        <BranchManagementActions onBranchChanged={fetchBranches} />
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading branches...
                </TableCell>
              </TableRow>
            ) : branches && branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>{branch.location || "N/A"}</TableCell>
                  <TableCell>{new Date(branch.created_at).toLocaleString()}</TableCell>
                  <TableCell>{new Date(branch.updated_at).toLocaleString()}</TableCell>
                  <TableCell className="flex justify-center items-center h-[57px]">
                    <BranchManagementActions branchToEdit={branch} onBranchChanged={fetchBranches} />
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