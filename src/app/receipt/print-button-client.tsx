// src/app/receipt/print-button-client.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PrinterIcon } from 'lucide-react';

export default function PrintButtonClient() {
  const handlePrint = () => {
    window.print(); // Triggers browser print dialog
  };

  return (
    <Button onClick={handlePrint} className="flex items-center space-x-2">
      <PrinterIcon className="h-5 w-5" /> <span>Print Receipt</span>
    </Button>
  );
}