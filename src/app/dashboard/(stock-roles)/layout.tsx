"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Home } from 'lucide-react';
import { toast } from 'sonner';

type UserProfile = {
  id: string;
  email: string;
  role: string;
  branch_id?: string | null;
};

const roleAllowedPages: Record<string, string> = {
  stock_controller: '/dashboard/stock-controller',
  stock_manager: '/dashboard/stock-manager',
};

export default function StockRolesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        router.replace('/');
        return;
      }

      const { data: profile, error: profileError } = await supabaseClient
        .from('users')
        .select('id, email, role, branch_id')
        .eq('id', user.id)
        .single();

      const allowedRoles = ['admin', 'general_manager', 'stock_manager', 'stock_controller'];
      if (profileError || !profile || !allowedRoles.includes(profile.role || '')) {
        router.replace('/dashboard/overview');
        return;
      }

      setUserProfile(profile as UserProfile);
      setLoadingProfile(false);
    };

    checkAuthAndRole();
  }, [router]);

  // Robust redirection for stock_controller and stock_manager
  useEffect(() => {
    if (!loadingProfile && userProfile) {
      if (
        (userProfile.role === 'stock_controller' && pathname !== roleAllowedPages.stock_controller)
      ) {
        window.location.replace(roleAllowedPages.stock_controller);
      }
      if (
        (userProfile.role === 'stock_manager' && pathname !== roleAllowedPages.stock_manager)
      ) {
        window.location.replace(roleAllowedPages.stock_manager);
      }
    } 
  }, [loadingProfile, userProfile, pathname]);

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      toast.error("Logout failed.", { description: error.message });
    } else {
      toast.success("Logged out successfully!");
      router.replace('/');
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="ml-2 text-gray-700">Loading user profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return <div className="text-red-500 p-8">Access Denied.</div>;
  }

  // No rendering Access Denied for stock roles - they are redirected above

  const showDashboardButton = ['admin', 'general_manager'].includes(userProfile.role);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-y-4 p-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800">Stock Portal</h1>
              <span className="text-sm font-medium capitalize bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                {userProfile.role?.replace(/_/g, ' ') || 'Unknown Role'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showDashboardButton && (
                <Button variant="outline" onClick={() => router.push('/dashboard/overview')}>
                  <Home className="h-4 w-4 md:mr-2" />
                  <span className='hidden md:inline'>Dashboard</span>
                </Button>
              )}
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 md:mr-2" />
                 <span className='hidden md:inline'>Logout</span>
              </Button>
            </div>
        </div>
      </header>

      <main className="flex-grow w-full">
        <div className="max-w-7xl mx-auto w-full p-2 sm:p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>  
  );
} 