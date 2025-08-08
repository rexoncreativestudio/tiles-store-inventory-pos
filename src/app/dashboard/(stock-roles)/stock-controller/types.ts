import { z } from 'zod';

// --- Data Types from DB (for passing as props) ---

export type WarehouseForController = {
  id: string;
  name: string;
  location: string | null;
  // branch_id and branches removed as warehouses are no longer linked to branches
};

export type ProductCategory = {
  id: string;
  name: string;
  unit_abbreviation: string | null;
  description?: string | null;
};

// Represents a product item within a pending audit submission (as submitted by controller)
export const controllerProductSubmissionSchema = z.object({
  tempId: z.string().uuid(), // Temporary ID for frontend keying
  product_name: z.string().min(1, "Product name is required."),
  product_ref: z.string().min(1, "Product reference is required."),
  quantity: z.number().int().min(1, "Quantity must be at least 1."),
  // --- UPDATED LINE ---
  // Changed .uuid() to .min(1) for more reliable submission validation.
  category_id: z.string().min(1, "Category is required."),
  product_unit_abbreviation: z.string().nullable().optional(),
});
export type ControllerProductSubmissionValues = z.infer<typeof controllerProductSubmissionSchema>;

// Schema for the entire stock submission (form)
export const controllerStockSubmissionFormSchema = z.object({
  submission_id: z.string().uuid().optional(), // For editing existing pending audits
  warehouse_id: z.string().min(1, "Warehouse is required."), // Accept any non-empty string
  submission_date: z.string().min(1, "Submission date is required."), // datetime-local format
  products_submitted: z.array(controllerProductSubmissionSchema).min(1, "At least one product must be submitted."),
  notes_from_controller: z.string().optional(),
});
export type ControllerStockSubmissionFormValues = z.infer<typeof controllerStockSubmissionFormSchema>;

// SubmissionDetail: for mapping submission_details from DB to frontend
export type SubmissionDetail = {
  product_name: string;
  product_ref: string;
  quantity: number;
  product_unit_abbreviation: string | null;
  category_id: string; // Now required and non-nullable
  purchase_price?: number;
  sale_price?: number;
};

// --- Pending Audit Record (from DB) ---
export type PendingAuditRecord = {
  id: string;
  submission_date: string;
  warehouse_id: string;
  recorded_by_controller_id: string;
  status: 'pending_audit' | 'approved' | 'rejected';
  audit_date: string | null;
  audited_by_manager_id: string | null;
  notes_from_manager: string | null;
  notes_from_controller: string | null;
  submission_details: SubmissionDetail[];
  created_at: string;
  updated_at: string;
  warehouses: { id: string; name: string; location: string | null } | null;

  // Relation aliases for joined users
  recorded_by_controller_user?: { id: string; email: string } | null;
  audited_by_manager_user?: { id: string; email: string } | null;
};

export type UserProfile = {
  id: string; 
  email: string;
  role: string;
};

/* --- Stock Review Modal Types --- */
export type StockReviewRow = {
  product_id: string;
  product_name: string;
  product_ref: string;
  warehouses: {
    warehouse_id: string;
    warehouse_name: string;
    quantity: number;
  }[];
  total_stock: number;
};