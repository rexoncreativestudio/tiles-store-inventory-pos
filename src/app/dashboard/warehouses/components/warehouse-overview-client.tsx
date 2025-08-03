// src/app/dashboard/warehouses/components/warehouse-overview-client.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Search, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { cn } from '@/lib/utils'; // REMOVED: cn is not used
import { supabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import WarehouseManagementActions from './warehouse-management-actions'; // ADDED: import for WarehouseManagementActions

// --- Type Definitions (aligned with page.tsx) ---
type WarehouseRecord = {
  id: string;
  name: string;
  location: string | null;
};

interface WarehouseOverviewClientProps {
  initialWarehouses: WarehouseRecord[];
}

export default function WarehouseOverviewClient({ initialWarehouses }: WarehouseOverviewClientProps) {
  const router = useRouter(); // Used for router.refresh()
  const [warehouseSearchQuery, setWarehouseSearchQuery] = useState('');
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseRecord | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // State for edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWarehouseForEdit, setSelectedWarehouseForEdit] = useState<WarehouseRecord | undefined>(undefined);

  const filteredWarehouses = useMemo(() => {
    let warehousesToDisplay = initialWarehouses;

    if (warehouseSearchQuery) {
      const lowerCaseQuery = warehouseSearchQuery.toLowerCase();
      warehousesToDisplay = warehousesToDisplay.filter(w =>
        w.name.toLowerCase().includes(lowerCaseQuery) ||
        w.location?.toLowerCase().includes(lowerCaseQuery)
      );
    }
    return warehousesToDisplay;
  }, [initialWarehouses, warehouseSearchQuery]);

  const handleViewDetails = (warehouse: WarehouseRecord) => {
    setSelectedWarehouse(warehouse);
    setIsViewDetailsDialogOpen(true);
  };

  const handleEditWarehouse = (warehouse: WarehouseRecord) => {
    setSelectedWarehouseForEdit(warehouse);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteConfirm = (warehouse: WarehouseRecord) => {
    setSelectedWarehouse(warehouse);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouse?.id) return;
    setIsProcessingAction(true);

    const { error } = await supabaseClient
      .from('warehouses')
      .delete()
      .eq('id', selectedWarehouse.id);

    if (error) {
      toast.error("Failed to delete warehouse.", { description: error.message });
      console.error("Delete warehouse error:", error);
    } else {
      toast.success("Warehouse deleted successfully!");
      setIsConfirmDeleteOpen(false);
      setSelectedWarehouse(null);
      router.refresh(); // Used router.refresh()
    }
    setIsProcessingAction(false);
  };

  // Renamed to explicitly reflect its purpose for view or delete modals
  const handleCloseViewOrDeleteModals = () => {
    setIsViewDetailsDialogOpen(false);
    setIsConfirmDeleteOpen(false);
    setSelectedWarehouse(null);
  };

  // Callback for when WarehouseManagementActions finishes submitting
  const handleWarehouseManagementSubmitted = () => {
    setIsEditModalOpen(false);
    setSelectedWarehouseForEdit(undefined);
    router.refresh(); // Used router.refresh()
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex justify-end mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search warehouses by name or location..."
            className="pl-10 w-full"
            value={warehouseSearchQuery}
            onChange={(e) => setWarehouseSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Warehouses</CardTitle>
          <CardDescription>Overview of all registered warehouses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]">SN</TableHead>
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead className="w-[40%]">Location</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((warehouse, idx) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell>{warehouse.location || 'N/A'}</TableCell>
                    <TableCell className="text-right flex space-x-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(warehouse)} title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditWarehouse(warehouse)} title="Edit Warehouse">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteConfirm(warehouse)} title="Delete Warehouse">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                    No warehouses found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Warehouse Details</DialogTitle>
            <DialogDescription>Details for warehouse: {selectedWarehouse?.name}</DialogDescription>
          </DialogHeader>
          {selectedWarehouse && (
            <div className="grid gap-4 py-4 text-sm">
              <p><strong>Name:</strong> {selectedWarehouse.name}</p>
              <p><strong>Location:</strong> {selectedWarehouse.location || 'N/A'}</p>
              <p><strong>ID:</strong> {selectedWarehouse.id}</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleCloseViewOrDeleteModals}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete warehouse &quot;{selectedWarehouse?.name}&quot;? This action cannot be undone and will affect all associated stock records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseViewOrDeleteModals} disabled={isProcessingAction}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWarehouse} disabled={isProcessingAction}>
              {isProcessingAction ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warehouse Management Actions (for Add/Edit functionality) */}
      <WarehouseManagementActions
        warehouseToEdit={selectedWarehouseForEdit}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onWarehouseSubmitted={handleWarehouseManagementSubmitted}
      />
    </div>
  );
}