"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { BusinessSettingsData } from "./types";

const businessSettingsSchema = z.object({
  business_name: z.string().min(1, { message: "Business name is required." }),
  address_line1: z.string().min(1, { message: "Address Line 1 is required." }),
  address_line2: z.string().optional(),
  city: z.string().min(1, { message: "City is required." }),
  state_province: z.string().optional(),
  country: z.string().min(1, { message: "Country is required." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal("")),
  phone_number: z.string().optional(),
  tax_number: z.string().optional(),
  logo_url: z.string().url({ message: "Invalid URL for logo." }).optional().or(z.literal("")),
  receipt_prefix: z.string().min(1, { message: "Receipt prefix is required." }),
  date_format: z.enum(["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"], { message: "Invalid date format." }),
  currency_symbol: z.string().min(1, { message: "Currency symbol is required." }),
  currency_position: z.enum(["prefix", "suffix"], { message: "Invalid currency position." }),
});

type BusinessSettingsValues = z.infer<typeof businessSettingsSchema>;

interface BusinessSettingsFormProps {
  initialData: BusinessSettingsData | null;
}

const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"];
const CURRENCY_POSITIONS = ["prefix", "suffix"];

export default function BusinessSettingsForm({ initialData }: BusinessSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BusinessSettingsValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      business_name: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state_province: "",
      country: "",
      email: "",
      phone_number: "",
      tax_number: "",
      logo_url: "",
      receipt_prefix: "",
      date_format: "DD/MM/YYYY",
      currency_symbol: "FCFA",
      currency_position: "suffix",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        address_line2: initialData.address_line2 || "",
        state_province: initialData.state_province || "",
        email: initialData.email || "",
        phone_number: initialData.phone_number || "",
        tax_number: initialData.tax_number || "",
        logo_url: initialData.logo_url || "",
        date_format: DATE_FORMATS.includes(initialData.date_format)
          ? initialData.date_format
          : "DD/MM/YYYY",
        currency_position: CURRENCY_POSITIONS.includes(initialData.currency_position)
          ? initialData.currency_position
          : "suffix",
      });
      setLogoPreviewUrl(initialData.logo_url || null);
    } else {
      form.reset({
        business_name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state_province: "",
        country: "",
        email: "",
        phone_number: "",
        tax_number: "",
        logo_url: "",
        receipt_prefix: "",
        date_format: "DD/MM/YYYY",
        currency_symbol: "FCFA",
        currency_position: "suffix",
      });
      setLogoPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const onSubmit: SubmitHandler<BusinessSettingsValues> = async (values) => {
    setIsLoading(true);
    let error = null;

    const payload = {
      ...values,
      address_line2: values.address_line2 || null,
      state_province: values.state_province || null,
      email: values.email || null,
      phone_number: values.phone_number || null,
      tax_number: values.tax_number || null,
      logo_url: values.logo_url || null,
    };

    if (initialData) {
      const { error: dbUpdateError } = await supabaseClient
        .from("business_settings")
        .update(payload)
        .eq("id", initialData.id);
      error = dbUpdateError;

      if (error) {
        toast.error("Failed to update business settings.", { description: error.message });
      } else {
        toast.success("Business settings updated successfully!");
        router.refresh();
      }
    } else {
      const { error: dbInsertError } = await supabaseClient
        .from("business_settings")
        .insert({ ...payload });
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
    if (!file) {
      setLogoPreviewUrl(null);
      form.setValue("logo_url", "", { shouldValidate: true });
      return;
    }

    // Temporary preview before upload
    const tempPreviewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(tempPreviewUrl);

    setIsLoading(true);
    // Use the correct bucket name: public-assets
    const filePath = `logos/logo_${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
      .from("public-assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      toast.error("Logo upload failed.", { description: error.message });
      setLogoPreviewUrl(form.getValues("logo_url") || null);
    } else if (data) {
      const { data: publicUrlData } = supabaseClient.storage.from("public-assets").getPublicUrl(data.path);
      if (publicUrlData) {
        form.setValue("logo_url", publicUrlData.publicUrl, { shouldValidate: true });
        setLogoPreviewUrl(publicUrlData.publicUrl);
        toast.success("Logo uploaded successfully! Click 'Save Changes' to apply.");
      } else {
        toast.error("Failed to get public URL for logo.");
        setLogoPreviewUrl(form.getValues("logo_url") || null);
      }
    }
    setIsLoading(false);
  };

  const handleCardClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl">Business Information</CardTitle>
        <CardDescription>
          Manage your store&apos;s general details and contact information.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="grid gap-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input id="business_name" {...form.register("business_name")} disabled={isLoading} />
              {form.formState.errors.business_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.business_name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input id="address_line1" {...form.register("address_line1")} disabled={isLoading} />
              {form.formState.errors.address_line1 && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.address_line1.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
              <Input id="address_line2" {...form.register("address_line2")} disabled={isLoading} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} disabled={isLoading} />
              {form.formState.errors.city && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.city.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="state_province">State/Province (Optional)</Label>
              <Input id="state_province" {...form.register("state_province")} disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register("country")} disabled={isLoading} />
              {form.formState.errors.country && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.country.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" type="email" {...form.register("email")} disabled={isLoading} />
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone_number">Phone Number(s) (Optional)</Label>
              <Textarea
                id="phone_number"
                placeholder="Enter multiple numbers separated by commas or new lines"
                {...form.register("phone_number")}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax_number">Tax Number (Optional)</Label>
              <Input id="tax_number" {...form.register("tax_number")} disabled={isLoading} />
            </div>

            <div className="md:col-span-2 grid gap-2">
              <Label>Business Logo</Label>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  style={{ display: "none" }}
                  disabled={isLoading}
                  data-testid="logo-file-input"
                />
                <div
                  tabIndex={0}
                  role="button"
                  aria-label="Upload business logo"
                  onClick={handleCardClick}
                  className={`group cursor-pointer w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative transition-all duration-150 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isLoading ? "opacity-70 pointer-events-none" : ""
                  }`}
                >
                  {logoPreviewUrl ? (
                    <Image
                      src={logoPreviewUrl}
                      alt="Logo Preview"
                      fill
                      style={{ objectFit: "contain" }}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <UploadCloud className="w-10 h-10 mb-2" />
                      <span className="text-xs">Click to upload logo</span>
                    </div>
                  )}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg z-10">
                      <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                {/* Display current URL for debugging/confirmation */}
                {form.watch("logo_url") && (
                  <a
                    href={form.watch("logo_url") || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs block mt-2"
                  >
                    View Current Logo URL
                  </a>
                )}
                {form.formState.errors.logo_url && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.logo_url.message}</p>
                )}
              </div>
              <Input type="hidden" {...form.register("logo_url")} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="grid gap-2">
              <Label htmlFor="receipt_prefix">Receipt Prefix</Label>
              <Input id="receipt_prefix" {...form.register("receipt_prefix")} disabled={isLoading} />
              {form.formState.errors.receipt_prefix && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.receipt_prefix.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date_format">Date Format</Label>
              <Select
                onValueChange={v => form.setValue("date_format", v as BusinessSettingsValues["date_format"], { shouldValidate: true })}
                value={DATE_FORMATS.includes(form.watch("date_format")) ? form.watch("date_format") : "DD/MM/YYYY"}
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
              {form.formState.errors.date_format && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.date_format.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency_symbol">Currency Symbol</Label>
              <Input id="currency_symbol" {...form.register("currency_symbol")} disabled={isLoading} />
              {form.formState.errors.currency_symbol && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.currency_symbol.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency_position">Currency Position</Label>
              <Select
                onValueChange={v => form.setValue("currency_position", v as BusinessSettingsValues["currency_position"], { shouldValidate: true })}
                value={CURRENCY_POSITIONS.includes(form.watch("currency_position")) ? form.watch("currency_position") : "suffix"}
                disabled={isLoading}
              >
                <SelectTrigger id="currency_position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefix">Prefix (e.g., $100)</SelectItem>
                  <SelectItem value="suffix">Suffix (e.g., 100 FCFA)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.currency_position && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.currency_position.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 