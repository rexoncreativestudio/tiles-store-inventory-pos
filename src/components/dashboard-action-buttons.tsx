// src/components/dashboard-action-buttons.tsx
"use client"; // This component must be a Client Component

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // Assuming you might use toasts here too
import React from "react"; // Explicitly import React

interface DashboardActionButtonsProps {
  userRole: string; // Pass the user role as a prop
}

export function DashboardActionButtons({ userRole }: DashboardActionButtonsProps) {
  const router = useRouter();

  const handleManageUsersClick = () => {
    toast.info("Navigating to User Management...");
    router.push("/dashboard/users"); // Example navigation
  };

  const handleGoToPosClick = () => {
    toast.info("Opening Point-of-Sale...");
    router.push("/pos"); // Example navigation to POS
  };

  return (
    <>
      {userRole === 'admin' && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-md">
          <h2 className="text-xl font-medium text-blue-800 mb-3">Admin Section Access:</h2>
          <p className="text-blue-700 mb-4">You have full administrative privileges.</p>
          <Button className="mt-2" onClick={handleManageUsersClick}>Manage Users</Button>
        </div>
      )}

      {userRole === 'cashier' && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-md">
          <h2 className="text-xl font-medium text-green-800 mb-3">Cashier&apos;s Quick Access:</h2>
          <p className="text-green-700 mb-4">Ready to process sales!</p>
          <Button className="mt-2" onClick={handleGoToPosClick}>Go to POS</Button>
        </div>
      )}
    </>
  );
}