// src/store/business-settings-store.ts
import { create } from 'zustand';

// Define the shape of your business settings state
interface BusinessSettingsState {
  id: string | null;
  businessName: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  receiptPrefix: string;
  dateFormat: string;
  // Add all other fields that are part of your business_settings table
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

  setSettings: (settings: Partial<BusinessSettingsState>) => void;
  // CORRECTED: initializeSettings now accepts a Partial of the state, excluding methods
  initializeSettings: (settings: Partial<Omit<BusinessSettingsState, 'setSettings' | 'initializeSettings'>>) => void;
}

export const useBusinessSettingsStore = create<BusinessSettingsState>((set) => ({
  id: null,
  businessName: 'Your Tiles Store',
  currencySymbol: '$',
  currencyPosition: 'prefix',
  receiptPrefix: 'TRS-',
  dateFormat: 'YYYY-MM-DD',
  // Default values for new fields
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

  setSettings: (settings) => set((state) => ({ ...state, ...settings })),
  // CORRECTED: Implement initializeSettings to merge incoming data
  initializeSettings: (settingsData) => set((state) => ({ ...state, ...settingsData })),
}));