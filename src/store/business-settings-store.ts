import { create } from 'zustand';
import { supabaseClient } from '@/lib/supabase/client';

// Define the shape of your business settings state
export interface BusinessSettingsState {
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
  zipPostalCode: string | null;
  country: string;
  email: string | null;
  phoneNumber: string | null;
  taxNumber: string | null;
  logoUrl: string | null;
  defaultReceiptLanguage: 'en' | 'fr';

  // Actions
  setSettings: (settings: Partial<BusinessSettingsState>) => void;
  initializeSettings: (settings: Partial<BusinessSettingsState>) => void;
  hydrateSettings: () => Promise<void>;
}

export const useBusinessSettingsStore = create<BusinessSettingsState>((set, get) => ({
  // Default values
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
  defaultReceiptLanguage: 'en',

  // Update part of the state
  setSettings: (settings) => set((state) => ({ ...state, ...settings })),

  // Initialize the store with settings (used for SSR/CSR hydration)
  initializeSettings: (settings) => {
    set((state) => ({
      ...state,
      ...settings,
    }));
  },

  // Fetch settings from Supabase and hydrate the store
  hydrateSettings: async () => {
    if (get().id !== null && get().businessName !== 'Your Tiles Store') {
      return;
    }

    const { data: settings, error } = await supabaseClient
      .from('business_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error hydrating business settings store:", error.message);
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
    } else {
      console.log("No business settings found in DB, using default store values.");
    }
  },
})); 