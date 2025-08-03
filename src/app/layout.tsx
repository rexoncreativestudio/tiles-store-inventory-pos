import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AppShell from "@/components/app-shell";
import StoreHydrator from "@/components/store-hydrator";
import React from 'react';
import { createServerSupabaseClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MEGA COMPANY SARL",
  description: "A Point of Sale and Inventory Management System for Tile Stores",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetch user and role server-side for hydration consistency
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let normalizedRole: string | null = null;
  if (user?.id) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    normalizedRole = userProfile?.role?.replace(/[_\s]/g, "").toLowerCase() ?? null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className + " bg-gray-100 min-h-screen"}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <StoreHydrator>
            {/* Pass role prop to AppShell */}
            <AppShell role={normalizedRole}>{children}</AppShell>
          </StoreHydrator>
        </ThemeProvider>
      </body>
    </html>
  ); 
}