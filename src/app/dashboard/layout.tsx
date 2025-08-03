// src/app/dashboard/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  return (
    // This div simply renders its children within the main content area,
    // relying entirely on the root layout (src/app/layout.tsx) for the sidebar and header.
    <div className="flex flex-col flex-1 w-full"> 
      {/* The main content area for dashboard pages */}
      <main className="flex-1 flex flex-col"> 
        {children}
      </main>
    </div>
  );
}