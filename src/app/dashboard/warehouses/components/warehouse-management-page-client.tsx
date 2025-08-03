"use client";

import React, { useState } from 'react';
import WarehouseOverviewClient from './warehouse-overview-client';
import WarehouseManagementActions from './warehouse-management-actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlusCircle } from 'lucide-react'; // Import the plus icon

type WarehouseRecord = {
  id: string;
  name: string;
  location: string | null;
};

export default function WarehouseManagementPageClient({ initialWarehouses }: { initialWarehouses: WarehouseRecord[] }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Warehouse Management</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Add Warehouse
        </Button>
      </div>
      <Separator className="mb-6" />

      <WarehouseOverviewClient initialWarehouses={initialWarehouses} />

      <WarehouseManagementActions
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onWarehouseSubmitted={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}