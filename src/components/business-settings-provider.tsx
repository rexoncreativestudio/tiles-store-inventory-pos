"use client";

import { useBusinessSettingsStore } from "@/store/business-settings-store";
import React, { useEffect } from "react";

interface BusinessSettingsProviderProps {
  initialSettings: {
    id: string;
    business_name: string;
    currency_symbol: string;
    currency_position: 'prefix' | 'suffix';
    receipt_prefix: string;
    date_format: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state_province: string | null;
    zip_postal_code: string | null;
    country: string;
    email: string | null;
    phone_number: string | null;
    tax_number: string | null;
    logo_url: string | null;
  } | null;
  children: React.ReactNode;
}

export function BusinessSettingsProvider({ initialSettings, children }: BusinessSettingsProviderProps) {
  const storeInitializeSettings = useBusinessSettingsStore((state) => state.initializeSettings);

  useEffect(() => {
    if (initialSettings) {
      storeInitializeSettings({
        id: initialSettings.id,
        businessName: initialSettings.business_name,
        currencySymbol: initialSettings.currency_symbol,
        currencyPosition: initialSettings.currency_position,
        receiptPrefix: initialSettings.receipt_prefix,
        dateFormat: initialSettings.date_format,
        addressLine1: initialSettings.address_line1,
        addressLine2: initialSettings.address_line2,
        city: initialSettings.city,
        stateProvince: initialSettings.state_province,
        zipPostalCode: initialSettings.zip_postal_code,
        country: initialSettings.country,
        email: initialSettings.email,
        phoneNumber: initialSettings.phone_number,
        taxNumber: initialSettings.tax_number,
        logoUrl: initialSettings.logo_url,
      });
    }
  }, [initialSettings, storeInitializeSettings]);

  return <>{children}</>;
} 