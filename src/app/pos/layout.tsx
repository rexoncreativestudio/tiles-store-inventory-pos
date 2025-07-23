// src/app/pos/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/'); // Redirect to login if not authenticated
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !['admin', 'general_manager', 'branch_manager', 'cashier'].includes(currentUserProfile?.role || '')) {
    console.error("Access Denied: Unauthorized role trying to access POS.");
    redirect('/dashboard/overview'); // Redirect to dashboard for unauthorized roles
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="w-full bg-white border-b shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Tiles Store POS</h1>
        <form action={async () => { 'use server'; const s = await createServerSupabaseClient(); await s.auth.signOut(); redirect('/'); }}>
          <Button variant="outline">Logout</Button>
        </form>
      </header>
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}