// src/app/dashboard/settings/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator"; // Ensure Separator is imported
import UnitsSettings from './units-settings'; // Client component for Units
import CategoriesSettings from './categories-settings'; // Client component for Categories
import BusinessSettingsForm from './business-settings-form'; // Client component for Business Settings
import ReceiptPhrasesSettings from './receipt-phrases-settings'; // Client component for Receipt Phrases

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Enforce admin access on server-side
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || currentUserProfile?.role !== 'admin') {
    console.error("Access Denied: Non-admin trying to access Settings.");
    redirect('/dashboard/overview');
  }

  // Fetch initial data for each section here (Server-side)
  // Units
  const { data: units, error: unitsError } = await supabase.from('units').select('id, name, abbreviation');
  if (unitsError) console.error("Error fetching units:", unitsError.message);

  // Categories
  const { data: categories, error: categoriesError } = await supabase.from('categories').select('id, name, description');
  if (categoriesError) console.error("Error fetching categories:", categoriesError.message);

  // Business Settings (single row)
  // Ensure all fields match the expected type, especially the enum types
  const { data: businessSettings, error: bsError } = await supabase
    .from('business_settings')
    .select('*, date_format, currency_position, default_receipt_language') // Explicitly select enum fields
    .single();

  if (bsError && bsError.code !== 'PGRST116') { // PGRST116 is 'no rows found', which is fine for initial empty table
    console.error("Error fetching business settings:", bsError.message);
  }

  // Receipt Phrases
  // Ensure created_at and updated_at are selected
  const { data: receiptPhrases, error: rpError } = await supabase
    .from('receipt_phrases')
    .select('id, phrase_key, language, text, created_at, updated_at');
  if (rpError) console.error("Error fetching receipt phrases:", rpError.message);


  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Application Settings</h1>
      <Separator className="mb-6" />

      <Tabs defaultValue="business" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="receipt">Receipts</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <BusinessSettingsForm initialData={businessSettings} />
        </TabsContent>

        <TabsContent value="receipt" className="mt-4">
          <ReceiptPhrasesSettings initialData={receiptPhrases || []} />
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <UnitsSettings initialData={units || []} />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoriesSettings initialData={categories || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}