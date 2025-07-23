// src/app/dashboard/users/user-management-actions.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";



// Define the enum values as a const tuple
const UserRoleOptions = ['admin', 'general_manager', 'branch_manager', 'cashier'] as const;
type UserRole = typeof UserRoleOptions[number]; // Infer the union type from the const tuple

// Define Zod schema for user form validation
const userFormSchema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }),
  // CORRECTED: Password schema - simple optional string. Handle empty string transform before schema.
  password: z.string().optional() // Password field is optional, will be string | undefined
    .refine(val => !val || val.length >= 6, { // Validate length if a value is present
      message: "Password must be at least 6 characters if provided."
    }),
  // CORRECTED: Role schema - simple string, refine for validation
  role: z.string() // Expect string from Select input
    .refine((val): val is UserRole => UserRoleOptions.includes(val as UserRole), { // Refine to check if value is one of the allowed roles
      message: "Please select a valid role.",
    }),
  branch_id: z.string().uuid("Invalid branch ID.").nullable(),
});

// Zod's .infer will correctly map optional string to string | undefined
type UserFormValues = z.infer<typeof userFormSchema>;

// Define the type for a user with their associated branch
type UserWithBranch = {
  id: string;
  email: string;
  role: UserRole; // Use the inferred UserRole type
  branch_id: string | null;
  branches?: { id: string; name: string } | null;
};

interface UserManagementActionsProps {
  branches: Array<{ id: string; name: string }>;
  userToEdit?: UserWithBranch;
}

export default function UserManagementActions({ branches, userToEdit }: UserManagementActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: userToEdit
      ? {
          id: userToEdit.id,
          email: userToEdit.email,
          role: userToEdit.role,
          branch_id: userToEdit.branch_id,
          password: undefined, // Initialize password as undefined for updates (optional field)
        }
      : {
          email: "",
          password: "", // Required string for new user (will be validated by frontend check)
          role: undefined, // undefined for initial empty state
          branch_id: null,
        },
  });

  React.useEffect(() => {
    if (isDialogOpen) {
      form.reset(userToEdit ? {
        id: userToEdit.id,
        email: userToEdit.email,
        role: userToEdit.role,
        branch_id: userToEdit.branch_id,
        password: undefined, // Reset password to undefined for updates
      } : {
        email: "",
        password: "", // Reset to empty string for new user (will be validated)
        role: undefined,
        branch_id: null,
      });
      form.clearErrors();
    }
  }, [isDialogOpen, userToEdit, form]);


  const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
    setIsLoading(true);

    // CRITICAL: Manually transform password from "" to undefined *before* sending to API
    const passwordToSubmit = values.password === "" ? undefined : values.password;

    if (userToEdit) {
      // Logic for updating existing user via API route
      const payload = {
        email: values.email,
        role: values.role, // This role is a validated string
        branch_id: values.branch_id,
        password: passwordToSubmit, // Will be undefined or string
      };

      const response = await fetch(`/api/admin/users/${userToEdit.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error("Failed to update user.", { description: errorData.error || "An unknown error occurred." });
        setIsLoading(false);
        return;
      }

      toast.success("User updated successfully!");
      setIsDialogOpen(false);
      router.refresh();
    } else {
      // Logic for creating new user
      if (!values.password || values.password.trim().length === 0) { // Check if password is actually provided for new user
        form.setError("password", { message: "Password is required for new users." });
        setIsLoading(false);
        return;
      }

      const payload = {
        email: values.email,
        password: values.password, // This will be a string
        role: values.role, // Validated string
        branch_id: values.branch_id, // Pass as UUID or null
      };

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error("Failed to add new user.", { description: errorData.error || "An unknown error occurred." });
        setIsLoading(false);
        return;
      }

      toast.success("New user added successfully!");
      setIsDialogOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!userToEdit?.id) {
      toast.error("No user selected for deletion.");
      setIsLoading(false);
      return;
    }

    const response = await fetch(`/api/admin/users/${userToEdit.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      toast.error("Failed to delete user.", { description: errorData.error || "An unknown error occurred." });
      setIsLoading(false);
      return;
    }

    toast.success("User deleted successfully!");
    setIsConfirmDeleteOpen(false);
    setIsLoading(false);
    router.refresh();
  };

  const isNewUser = !userToEdit;

  return (
    <>
      {!userToEdit && (
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      )}

      {userToEdit && (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)} title="Edit User">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setIsConfirmDeleteOpen(true)} title="Delete User">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isNewUser ? "Add New User" : `Edit User: ${userToEdit?.email}`}</DialogTitle>
            <DialogDescription>
              {isNewUser ? "Enter details for the new user." : "Make changes to the user&apos;s profile here."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                className="col-span-3"
                {...form.register("email")}
                disabled={isLoading}
              />
              {form.formState.errors.email && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isNewUser ? "Enter password" : "Leave blank to keep current"}
                className="col-span-3"
                {...form.register("password")}
                disabled={isLoading}
              />
              {form.formState.errors.password && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                onValueChange={(value: UserFormValues['role']) => form.setValue("role", value, { shouldValidate: true })}
                value={form.watch("role") || ""}
                disabled={isLoading}
              >
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {UserRoleOptions.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.role && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.role.message}</p>}
            </div>

            {(form.watch("role") === 'branch_manager' || form.watch("role") === 'cashier') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch" className="text-right">
                  Branch
                </Label>
                <Select
                  onValueChange={(value) => form.setValue("branch_id", value, { shouldValidate: true })}
                  value={form.watch("branch_id") || ""}
                  disabled={isLoading}
                >
                  <SelectTrigger id="branch" className="col-span-3">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.branch_id && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.branch_id.message}</p>}
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isNewUser ? "Adding User..." : "Saving Changes...") : (isNewUser ? "Add User" : "Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user &quot;{userToEdit?.email}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}