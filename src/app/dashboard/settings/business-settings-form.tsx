// src/app/dashboard/settings/business-settings-form.tsx
"use client";

import React, { useState } from 'react'; // Removed useEffect, as it's not directly used here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form"; // Import SubmitHandler
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from "@/components/ui/separator"; // Import Separator

// Define Zod schema for business settings form validation
const businessSettingsSchema = z.object({
  business_name: z.string().min(1, { message: "Business name is required." }),
  address_line1: z.string().min(1, { message: "Address Line 1 is required." }),
  address_line2: z.string().optional(),
  city: z.string().min(1, { message: "City is required." }),
  state_province: z.string().optional(),
  zip_postal_code: z.string().optional(),
  country: z.string().min(1, { message: "Country is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone_number: z.string().optional(),
  tax_number: z.string().optional(),
  logo_url: z.string().url({ message: "Invalid URL for logo." }).optional().or(z.literal('')),
  receipt_prefix: z.string().min(1, { message: "Receipt prefix is required." }),
  // CORRECTED: Explicitly define literal types for enums in Zod schema
  date_format: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'], { message: "Invalid date format." }),
  currency_symbol: z.string().min(1, { message: "Currency symbol is required." }),
  currency_position: z.enum(['prefix', 'suffix'], { message: "Invalid currency position." }),
  default_receipt_language: z.enum(['en', 'fr'], { message: "Invalid language." }),
});

type BusinessSettingsValues = z.infer<typeof businessSettingsSchema>;

interface BusinessSettingsFormProps {
  initialData: {
    id: string;
    business_name: string;
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
    receipt_prefix: string;
    // CORRECTED: Explicitly define literal types for enums in the interface
    date_format: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
    currency_symbol: string;
    currency_position: "prefix" | "suffix";
    default_receipt_language: "en" | "fr";
    created_at: string;
    updated_at: string;
  } | null;
}

export default function BusinessSettingsForm({ initialData }: BusinessSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<BusinessSettingsValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          address_line2: initialData.address_line2 || '',
          state_province: initialData.state_province || '',
          zip_postal_code: initialData.zip_postal_code || '',
          email: initialData.email || '',
          phone_number: initialData.phone_number || '',
          tax_number: initialData.tax_number || '',
          logo_url: initialData.logo_url || '',
        }
      : {
          business_name: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state_province: "",
          zip_postal_code: "",
          country: "",
          email: "",
          phone_number: "",
          tax_number: "",
          logo_url: "",
          receipt_prefix: "",
          date_format: "YYYY-MM-DD",
          currency_symbol: "$",
          currency_position: "prefix",
          default_receipt_language: "en",
        },
  });

  // Explicitly type onSubmit to match SubmitHandler
  const onSubmit: SubmitHandler<BusinessSettingsValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    // Sanitize empty strings to null for DB storage
    const payload = {
      ...values,
      address_line2: values.address_line2 || null,
      state_province: values.state_province || null,
      zip_postal_code: values.zip_postal_code || null,
      email: values.email || null,
      phone_number: values.phone_number || null,
      tax_number: values.tax_number || null,
      logo_url: values.logo_url || null,
    };

    if (initialData) {
      // Update existing settings (there should only be one row)
      const { error: dbUpdateError } = await supabaseClient
        .from('business_settings')
        .update(payload)
        .eq('id', initialData.id);
      error = dbUpdateError;

      if (error) {
        toast.error("Failed to update business settings.", { description: error.message });
      } else {
        toast.success("Business settings updated successfully!");
        router.refresh(); // Revalidate data on the server
      }
    } else {
      // Insert new settings (first time)
      const { error: dbInsertError } = await supabaseClient
        .from('business_settings')
        .insert({ ...payload, id: '00000000-0000-0000-0000-000000000001' }); // Use the fixed ID
      error = dbInsertError;

      if (error) {
        toast.error("Failed to save business settings.", { description: error.message });
      } else {
        toast.success("Business settings saved successfully!");
        router.refresh();
      }
    }
    setIsLoading(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const fileName = `logo_${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
      .from('public_assets') // Ensure you have a bucket named 'public_assets' in Supabase Storage
      .upload(`logos/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      toast.error("Logo upload failed.", { description: error.message });
    } else if (data) {
      const { data: publicUrlData } = supabaseClient.storage.from('public_assets').getPublicUrl(data.path);
      if (publicUrlData) {
        form.setValue('logo_url', publicUrlData.publicUrl);
        toast.success("Logo uploaded successfully! Click 'Save Changes' to update.");
      } else {
        toast.error("Failed to get public URL for logo.");
      }
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Manage your store&apos;s general details and contact information.</CardDescription> {/* Escaped apostrophe */}
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input id="business_name" {...form.register("business_name")} disabled={isLoading} />
              {form.formState.errors.business_name && <p className="text-red-500 text-sm mt-1">{form.formState.errors.business_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input id="address_line1" {...form.register("address_line1")} disabled={isLoading} />
              {form.formState.errors.address_line1 && <p className="text-red-500 text-sm mt-1">{form.formState.errors.address_line1.message}</p>}
            </div>
            <div>
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input id="address_line2" {...form.register("address_line2")} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} disabled={isLoading} />
              {form.formState.errors.city && <p className="text-red-500 text-sm mt-1">{form.formState.errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="state_province">State/Province (Optional)</Label>
              <Input id="state_province" {...form.register("state_province")} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="zip_postal_code">Zip/Postal Code (Optional)</Label>
              <Input id="zip_postal_code" {...form.register("zip_postal_code")} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register("country")} disabled={isLoading} />
              {form.formState.errors.country && <p className="text-red-500 text-sm mt-1">{form.formState.errors.country.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" type="email" {...form.register("email")} disabled={isLoading} />
              {form.formState.errors.email && <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number (Optional)</Label>
              <Input id="phone_number" {...form.register("phone_number")} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="tax_number">Tax Number (Optional)</Label>
              <Input id="tax_number" {...form.register("tax_number")} disabled={isLoading} />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="logo_url">Business Logo</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="logo_url_file"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-auto"
                  disabled={isLoading}
                />
                {form.watch('logo_url') && (
                  <a href={form.watch('logo_url') || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                    View Current Logo
                  </a>
                )}
                {form.formState.errors.logo_url && <p className="text-red-500 text-sm mt-1">{form.formState.errors.logo_url.message}</p>}
              </div>
              <Input type="hidden" {...form.register("logo_url")} /> {/* Hidden input to store URL */}
            </div>
          </div>

          <Separator /> {/* Separator within the form */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receipt_prefix">Receipt Prefix</Label>
              <Input id="receipt_prefix" {...form.register("receipt_prefix")} disabled={isLoading} />
              {form.formState.errors.receipt_prefix && <p className="text-red-500 text-sm mt-1">{form.formState.errors.receipt_prefix.message}</p>}
            </div>
            <div>
              <Label htmlFor="date_format">Date Format</Label>
              <Select
                onValueChange={(value: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY") => form.setValue("date_format", value, { shouldValidate: true })}
                value={form.watch("date_format")}
                disabled={isLoading}
              >
                <SelectTrigger id="date_format">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2025-07-20)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (e.g., 07/20/2025)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (e.g., 20/07/2025)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.date_format && <p className="text-red-500 text-sm mt-1">{form.formState.errors.date_format.message}</p>}
            </div>
            <div>
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input id="currency_symbol" {...form.register("currency_symbol")} disabled={isLoading} />
              {form.formState.errors.currency_symbol && <p className="text-red-500 text-sm mt-1">{form.formState.errors.currency_symbol.message}</p>}
            </div>
            <div>
              <Label htmlFor="currency_position">Currency Position</Label>
              <Select
                onValueChange={(value: "prefix" | "suffix") => form.setValue("currency_position", value, { shouldValidate: true })}
                value={form.watch("currency_position")}
                disabled={isLoading}
              >
                <SelectTrigger id="currency_position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefix">Prefix (e.g., $100)</SelectItem>
                  <SelectItem value="suffix">Suffix (e.g., 100€)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.currency_position && <p className="text-red-500 text-sm mt-1">{form.formState.errors.currency_position.message}</p>}
            </div>
            <div>
              <Label htmlFor="default_receipt_language">Default Receipt Language</Label>
              <Select
                onValueChange={(value: "en" | "fr") => form.setValue("default_receipt_language", value, { shouldValidate: true })}
                value={form.watch("default_receipt_language")}
                disabled={isLoading}
              >
                <SelectTrigger id="default_receipt_language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.default_receipt_language && <p className="text-red-500 text-sm mt-1">{form.formState.errors.default_receipt_language.message}</p>}
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}