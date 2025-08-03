// src/components/store-hydrator.tsx
"use client"; // This directive marks the entire file as a Client Component

import { useEffect } from 'react';
import React from 'react'; // Necessary for JSX and Hooks
import { useBusinessSettingsStore } from '@/store/business-settings-store';

export default function StoreHydrator({ children }: { children: React.ReactNode }) {
  const hydrateSettings = useBusinessSettingsStore((state) => state.hydrateSettings);

  useEffect(() => {
    // Call the async hydrate function when the component mounts
    hydrateSettings();
  }, [hydrateSettings]);

  return <>{children}</>; // Render children passed from the layout
}