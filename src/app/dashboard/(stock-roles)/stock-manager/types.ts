import { z } from "zod";

// --- Data Types from DB (for passing as props) ---

export type WarehouseForManager = {
  id: string;
  name: string;
  location: string | null;
  branch_id: string | null;
  branches?: { id: string; name: string } | null;
};

export type UserForManager = {
  id: string;
  email: string;
  role?: string;
};

export type BranchForManager = {
  id: string;
  name: string;
};

export type UserProfile = {
  id: string;
  email: string;
  role: string;
  branch_id?: string | null;
};

export type SubmittedProductItem = {
  product_name: string;
  product_ref: string;
  quantity: number;
  product_unit_abbreviation: string | null;
  category_id?: string | null;
  purchase_price?: number;
  sale_price?: number;
};

export type PendingAuditRecordForManager = {
  id: string;
  submission_date: string;
  warehouse_id: string;
  recorded_by_controller_id: string;
  status: "pending_audit" | "approved" | "rejected";
  audit_date: string | null;
  audited_by_manager_id: string | null;
  notes_from_manager: string | null;
  notes_from_controller: string | null;
  submission_details: SubmittedProductItem[];
  created_at: string;
  updated_at: string;
  warehouses: {
    id: string;
    name: string;
    branch_id: string | null;
    branches: { id: string; name: string } | null;
  } | null;
  recorded_by_controller_user: { id: string; email: string } | null;
  audited_by_manager_user?: { id: string; email: string } | null;
};

// --- Audit Form Types (Manager's input for approval) ---

export const managerAuditProductItemSchema = z.object({
  product_name: z.string(),
  product_ref: z.string(),
  quantity: z.number(),
  product_unit_abbreviation: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  purchase_price: z.number().min(0, "Purchase price must be 0 or more.").nullable(),
  sale_price: z.number().min(0, "Sale price must be 0 or more.").nullable(),
});
export type ManagerAuditProductItemValues = z.infer<typeof managerAuditProductItemSchema>;

// CORRECTED SCHEMA
export const managerAuditFormSchema = z.object({
  audit_id: z.string().uuid("Audit ID is missing or invalid."),
  status: z.enum(["approved", "rejected"]),
  manager_notes: z.string().optional(),
  audited_products: z.array(managerAuditProductItemSchema).min(1, "At least one product must be audited."),
})
// The .refine() method is now on the parent object, so it can see `status`.
.refine(data => {
  // If the status is 'rejected', validation passes automatically.
  if (data.status === 'rejected') {
    return true;
  }
  // If status is 'approved', check that every product has a valid price.
  return data.audited_products.every(
    item => item.purchase_price != null && item.sale_price != null
  );
}, {
  // This message will only appear if status is 'approved' and a price is missing.
  message: "Purchase and Sale prices are required for all products when approving.",
  path: ["audited_products"], // You can still point the error message to the products array.
});

export type ManagerAuditFormValues = z.infer<typeof managerAuditFormSchema>;

export interface ManagerAuditDialogProps {
  auditToProcess?: PendingAuditRecordForManager;
  currentManagerId: string;
  isOpen: boolean;
  onClose: () => void;
  onAuditProcessed: () => void;
}

export interface ManagerAuditTableProps {
  initialPendingAudits: PendingAuditRecordForManager[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  warehouses: WarehouseForManager[];
  controllers: UserForManager[];
  currentUserRole: string;
  currentManagerId: string;
}
