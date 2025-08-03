// src/store/business-settings-store.ts
import { create } from 'zustand';
import { supabaseClient } from '@/lib/supabase/client'; // Import supabaseClient

// Define the shape of your business settings state
interface BusinessSettingsState {
  id: string | null;
  businessName: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  receiptPrefix: string;
  dateFormat: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  zipPostalCode: string | null; // Still in DB schema, so keep in state type
  country: string;
  email: string | null;
  phoneNumber: string | null;
  taxNumber: string | null;
  logoUrl: string | null;
  defaultReceiptLanguage: 'en' | 'fr'; // Still in DB schema, so keep in state type

  setSettings: (settings: Partial<BusinessSettingsState>) => void;
  // hydrateSettings: function to fetch and set initial/updated settings
  hydrateSettings: () => Promise<void>;
}

export const useBusinessSettingsStore = create<BusinessSettingsState>((set, get) => ({
  // Default values for the store (used before hydration or if no settings in DB)
  id: null,
  businessName: 'Your Tiles Store',
  currencySymbol: '$',
  currencyPosition: 'prefix',
  receiptPrefix: 'TRS-',
  dateFormat: 'YYYY-MM-DD',
  addressLine1: '',
  addressLine2: null,
  city: '',
  stateProvince: null,
  zipPostalCode: null,
  country: '',
  email: null,
  phoneNumber: null,
  taxNumber: null,
  logoUrl: null,
  defaultReceiptLanguage: 'en', // Default for language

  // Action to update parts of the state
  setSettings: (settings) => set((state) => ({ ...state, ...settings })),

  // Action to fetch settings from DB and hydrate the store
  hydrateSettings: async () => {
    // Prevent re-fetching if already hydrated and not explicitly told to refresh
    // We can add a timestamp or a 'hydrated' flag if more complex caching is needed
    if (get().id !== null && get().businessName !== 'Your Tiles Store') {
      // console.log("Business settings already hydrated."); // Optional: for debugging
      return;
    }

    const { data: settings, error } = await supabaseClient
      .from('business_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found", which is fine for initial setup
      console.error("Error hydrating business settings store:", error.message);
      // Optionally set some error state or toast here, but don't block the app
      return;
    }

    if (settings) {
      set({
        id: settings.id,
        businessName: settings.business_name,
        currencySymbol: settings.currency_symbol,
        currencyPosition: settings.currency_position,
        receiptPrefix: settings.receipt_prefix,
        dateFormat: settings.date_format,
        addressLine1: settings.address_line1,
        addressLine2: settings.address_line2,
        city: settings.city,
        stateProvince: settings.state_province,
        zipPostalCode: settings.zip_postal_code,
        country: settings.country,
        email: settings.email,
        phoneNumber: settings.phone_number,
        taxNumber: settings.tax_number,
        logoUrl: settings.logo_url,
        defaultReceiptLanguage: settings.default_receipt_language,
      });
      // console.log("Business settings store hydrated with data:", settings); // Optional: for debugging
    } else {
      // If no settings found, the store will retain its initial default values
      console.log("No business settings found in DB, using default store values.");
    }
  },
}));