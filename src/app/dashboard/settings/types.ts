// src/app/dashboard/settings/types.ts

// Type for Business Settings data
export type BusinessSettingsData = {
  id: string;
  business_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string | null;
  zip_postal_code: string | null; // Still present in DB data
  country: string;
  email: string | null;
  phone_number: string | null; // Text field, can contain multiple numbers
  tax_number: string | null;
  logo_url: string | null;
  receipt_prefix: string;
  date_format: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
  currency_symbol: string;
  currency_position: "prefix" | "suffix";
  default_receipt_language: "en" | "fr"; // Still present in DB data
  created_at: string;
  updated_at: string;
};

// Type for Category data
export type CategoryData = {
  id: string;
  name: string;
  description: string | null;
  unit_abbreviation: string | null;
};