"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PrinterIcon, ArrowLeftIcon } from 'lucide-react';

export default function PrintButtonClient() {
  const handlePrint = () => {
    window.print(); // Triggers browser print dialog
  };

  const handleGoBack = () => {
    window.history.back(); // Navigates to the previous page
  };  

  return (
    <div className="flex space-x-4">
      <Button onClick={handlePrint} className="flex items-center space-x-2">
        <PrinterIcon className="h-5 w-5" /> <span>Print Receipt</span>
      </Button>
      <Button onClick={handleGoBack} variant="secondary" className="flex items-center space-x-2">
        <ArrowLeftIcon className="h-5 w-5" /> <span>Back</span>
      </Button>
    </div>
  );
}