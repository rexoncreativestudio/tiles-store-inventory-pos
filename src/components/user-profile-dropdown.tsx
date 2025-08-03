// src/components/user-profile-dropdown.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client'; // Import Supabase client
import { toast } from 'sonner'; // For notifications

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users2 } from 'lucide-react'; // Icon for the trigger button

export default function UserProfileDropdown() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      toast.error("Logout failed.", { description: error.message });
      console.error("Logout error:", error);
    } else {
      toast.success("Logged out successfully!");
      router.push('/'); // Redirect to login page
    }
  };

  const handleSettingsRedirect = () => {
    router.push('/dashboard/settings');
  };

  const handleSupportRedirect = () => {
    // This could redirect to a support page, open a modal, or external link
    toast.info("Support functionality is not yet implemented.");
    console.log("Support clicked.");
    // Example: router.push('/dashboard/support');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Users2 className="h-5 w-5" />
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSettingsRedirect}>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSupportRedirect}>Support</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}