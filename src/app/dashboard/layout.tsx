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
    <div className="flex min-h-screen"> {/* This is the main flex container for sidebar and content */}
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col flex-shrink-0"> {/* flex-shrink-0 to keep its width */}
        <h2 className="text-xl font-bold mb-6">Tiles Store POS</h2>
        <nav className="flex-grow">
          <ul>
            <li className="mb-2"><a href="/dashboard/overview" className="block p-2 rounded hover:bg-gray-700">Overview</a></li>
            <li className="mb-2"><a href="/dashboard/products" className="block p-2 rounded hover:bg-gray-700">Products</a></li>
            <li className="mb-2"><a href="/dashboard/stock" className="block p-2 rounded hover:bg-gray-700">Stock</a></li>
            <li className="mb-2"><a href="/dashboard/purchases" className="block p-2 rounded hover:bg-gray-700">Purchases</a></li>
            <li className="mb-2"><a href="/dashboard/sales" className="block p-2 rounded hover:bg-gray-700">Sales</a></li>
            <li className="mb-2"><a href="/dashboard/reports" className="block p-2 rounded hover:bg-gray-700">Reports</a></li>
            <li className="mb-2"><a href="/dashboard/accounting" className="block p-2 rounded hover:bg-gray-700">Accounting</a></li>
            <li className="mb-2"><a href="/pos" className="block p-2 rounded hover:bg-gray-700">POS</a></li>
            <li className="mb-2"><a href="/dashboard/users" className="block p-2 rounded hover:bg-gray-700">Users</a></li>
            <li className="mb-2"><a href="/dashboard/branches" className="block p-2 rounded hover:bg-gray-700">Branches</a></li>
            <li className="mb-2"><a href="/dashboard/settings" className="block p-2 rounded hover:bg-gray-700">Settings</a></li>
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col"> {/* Added flex-col to main to allow its children to stack vertically, and flex-1 to make it take remaining space */}
        {children}
      </main>
    </div>
  );
}