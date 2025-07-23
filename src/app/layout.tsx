// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BusinessSettingsProvider } from '@/components/business-settings-provider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tiles Store POS & Inventory",
  description: "Inventory Management and Point-of-Sale System for a Tiles Store",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient(); // Await the client
  // CORRECTED: Select all fields needed for BusinessSettingsState
  const { data: businessSettings, error: bsError } = await supabase
    .from('business_settings')
    .select(`
      id, business_name, currency_symbol, currency_position, receipt_prefix, date_format,
      address_line1, address_line2, city, state_province, zip_postal_code, country,
      email, phone_number, tax_number, logo_url
    `)
    .single();

  if (bsError && bsError.code !== 'PGRST116') {
    console.error("Error fetching business settings in RootLayout:", bsError.message);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReactQueryProvider>
          <BusinessSettingsProvider initialSettings={businessSettings}>
            {children}
          </BusinessSettingsProvider>
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}