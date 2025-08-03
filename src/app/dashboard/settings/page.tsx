// src/app/dashboard/settings/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';
import { Separator } from "@/components/ui/separator";
import CategoriesSettings from './categories-settings';
import BusinessSettingsForm from './business-settings-form';



export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: currentUserProfile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || currentUserProfile?.role !== 'admin') {
    console.error("Access Denied: Non-admin trying to access Settings.");
    redirect('/dashboard/overview');
  }

  // Fetch initial data for remaining sections
  // Business Settings (single row)
  const { data: businessSettings, error: bsError } = await supabase
    .from('business_settings')
    .select('id, business_name, address_line1, address_line2, city, state_province, zip_postal_code, country, email, phone_number, tax_number, logo_url, receipt_prefix, date_format, currency_symbol, currency_position, default_receipt_language, created_at, updated_at')
    .single();

  if (bsError && bsError.code !== 'PGRST116') {
    console.error("Error fetching business settings:", bsError.message);
  }

  // Categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, description, unit_abbreviation');
  if (categoriesError) console.error("Error fetching categories:", categoriesError.message);


  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Application Settings</h1>
      <Separator className="mb-8" />

      {/* Business Info Section */}
      <section id="business-info-settings" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Business Information</h2>
        <BusinessSettingsForm initialData={businessSettings} />
      </section>

      {/* Categories Section */}
      <section id="categories-settings">
        <h2 className="text-2xl font-semibold mb-4">Categories Management</h2>
        <CategoriesSettings initialData={categories || []} />
      </section>
    </div>
  );
} 