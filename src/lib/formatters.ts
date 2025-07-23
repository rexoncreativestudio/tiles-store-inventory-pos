// src/lib/formatters.ts
import { useBusinessSettingsStore } from "@/store/business-settings-store"; // CORRECTED: Absolute path

export function useCurrencyFormatter() {
  const currencySymbol = useBusinessSettingsStore((state) => state.currencySymbol);
  const currencyPosition = useBusinessSettingsStore((state) => state.currencyPosition);

  const formatCurrency = (amount: number) => {
    if (currencyPosition === 'prefix') {
      return `${currencySymbol}${amount.toFixed(2)}`;
    } else {
      return `${amount.toFixed(2)}${currencySymbol}`;
    }
  };

  return { formatCurrency, currencySymbol, currencyPosition };
}