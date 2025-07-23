// src/components/dashboard-overview-actions.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface DashboardOverviewActionsProps {
  userRole: string;
}

export function DashboardOverviewActions({ userRole }: DashboardOverviewActionsProps) {
  const router = useRouter();

  const navigateToUsers = () => {
    router.push('/dashboard/users');
  };

  const navigateToBranches = () => {
    router.push('/dashboard/branches');
  };

  const navigateToSettings = () => {
    router.push('/dashboard/settings');
  };

  const navigateToProducts = () => {
    router.push('/dashboard/products');
  };

  const navigateToStock = () => {
    router.push('/dashboard/stock');
  };

  const navigateToPOS = () => {
    router.push('/pos');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Admin-specific actions */}
      {userRole === 'admin' && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-md">
          <h2 className="text-xl font-medium text-blue-800 mb-3">Admin Section Access:</h2>
          <p className="text-blue-700 mb-4">You have full administrative privileges.</p>
          <Button className="mt-2" onClick={navigateToUsers}>Manage Users</Button>
          <Button className="mt-2 ml-2" onClick={navigateToBranches}>Manage Branches</Button>
          <Button className="mt-2 ml-2" onClick={navigateToProducts}>Manage Products</Button>
          <Button className="mt-2 ml-2" onClick={navigateToStock}>Manage Stock</Button>
          <Button className="mt-2 ml-2" onClick={navigateToSettings}>App Settings</Button>
          {/* REMOVED: Go to POS button from admin block to prevent duplication.
                      Admins can use the sidebar link if needed. */}
          {/* <Button className="mt-2 ml-2" onClick={navigateToPOS} variant="default">Go to POS</Button> */}
        </div>
      )}

      {/* Cashier-specific actions */}
      {userRole === 'cashier' && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-md">
          <h2 className="text-xl font-medium text-green-800 mb-3">Cashier&apos;s Quick Access:</h2>
          <p className="text-green-700 mb-4">Ready to process sales!</p>
          <Button className="mt-2" onClick={navigateToPOS}>Go to POS</Button>
        </div>
      )}

      {/* NEW: General Manager or Branch Manager specific actions (if different from Admin/Cashier) */}
      {['general_manager', 'branch_manager'].includes(userRole) && userRole !== 'admin' && userRole !== 'cashier' && (
        <div className="mt-8 p-6 bg-purple-50 border border-purple-200 rounded-lg shadow-md">
          <h2 className="text-xl font-medium text-purple-800 mb-3">Manager Quick Access:</h2>
          <p className="text-purple-700 mb-4">Overview of store operations.</p>
          <Button className="mt-2" onClick={navigateToProducts}>View Products</Button>
          <Button className="mt-2 ml-2" onClick={navigateToStock}>View Stock</Button>
          <Button className="mt-2 ml-2" onClick={navigateToPOS}>Go to POS</Button> {/* Managers can also use POS */}
        </div>
      )}
    </div>
  );
}