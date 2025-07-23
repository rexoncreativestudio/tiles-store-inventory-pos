// src/app/dashboard/overview/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DashboardOverviewActions } from '@/components/dashboard-overview-actions'; // Import the client component

export default async function DashboardHomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile for dashboard:", profileError.message);
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-xl font-bold mb-4">Error Loading Dashboard</h1>
        <p>Could not load user profile: {profileError.message}</p>
        <p>Please try again or contact support.</p>
        <form action={async () => { 'use server'; const s = await createServerSupabaseClient(); await s.auth.signOut(); redirect('/'); }}>
          <Button type="submit" variant="outline" className="mt-4">Logout</Button>
        </form>
      </div>
    );
  }

  const { data: businessSettings, error: bsError } = await supabase
    .from('business_settings')
    .select('*')
    .single();

  if (bsError && bsError.code !== 'PGRST116') {
    console.error("Error fetching business settings for dashboard overview:", bsError.message);
  }

  const handleLogout = async () => {
    'use server';
    const logoutSupabase = await createServerSupabaseClient();
    await logoutSupabase.auth.signOut();
    redirect('/');
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <header className="flex justify-between items-center py-4 px-6 bg-white border-b shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-800">Welcome, {userProfile?.email || user.email}!</h1>
        <form action={handleLogout}>
          <Button type="submit" variant="destructive">Logout</Button>
        </form>
      </header>

      <div className="p-8 flex-grow">
        <p className="text-lg mb-4 text-gray-700">You are logged in as <span className="font-bold text-blue-600">{userProfile?.role || 'Unknown Role'}</span>.</p>
        <p className="mb-6 text-gray-600">This is your dashboard. More content will be added here for specific roles (Admin, Manager, Cashier).</p>

        {/* Business Overview Card (for Admins/Managers) */}
        {['admin', 'general_manager', 'branch_manager'].includes(userProfile?.role || '') && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Business Overview</CardTitle>
                <CardDescription>Key settings at a glance.</CardDescription>
              </CardHeader>
              <CardContent>
                {businessSettings ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-700">Business Name:</h3>
                      <p className="text-gray-900">{businessSettings.business_name}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Address:</h3>
                      <p className="text-gray-900">{businessSettings.address_line1}, {businessSettings.city}, {businessSettings.country}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Contact:</h3>
                      <p className="text-gray-900">{businessSettings.email || 'N/A'} | {businessSettings.phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Currency:</h3>
                      <p className="text-gray-900">{`${businessSettings.currency_symbol} (Position: ${businessSettings.currency_position})`}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Date Format:</h3>
                      <p className="text-gray-900">{businessSettings.date_format}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700">Receipt Prefix:</h3>
                      <p className="text-gray-900">{businessSettings.receipt_prefix}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">Business settings not configured. Please go to <a href="/dashboard/settings" className="text-blue-600 hover:underline">Settings</a> to set them up.</p>
                )}
              </CardContent>
            </Card>

            <Separator />
          </div>
        )}

        {/* CORRECTED: Render DashboardOverviewActions ONLY ONCE */}
        {/* It will now handle its own conditional rendering of buttons based on userRole */}
        {userProfile?.role && (
          <DashboardOverviewActions
            userRole={userProfile.role}
          />
        )}
      </div>
    </div>
  );
}