// src/app/dashboard/settings/receipt-phrases-settings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


// Define Zod schema for receipt phrase form validation
const phraseFormSchema = z.object({
  id: z.string().optional(),
  phrase_key: z.string().min(1, { message: "Phrase key is required." }),
  language: z.enum(['en', 'fr'], { message: "Invalid language." }),
  text: z.string().min(1, { message: "Phrase text is required." }),
});

type PhraseFormValues = z.infer<typeof phraseFormSchema>;

interface ReceiptPhrasesSettingsProps {
  initialData: Array<{
    id: string;
    phrase_key: string;
    language: 'en' | 'fr';
    text: string;
    created_at: string;
    updated_at: string;
  }>;
}

export default function ReceiptPhrasesSettings({ initialData }: ReceiptPhrasesSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [phraseToEdit, setPhraseToEdit] = useState<typeof initialData[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<PhraseFormValues>({
    resolver: zodResolver(phraseFormSchema),
    defaultValues: { phrase_key: "", language: "en", text: "" },
  });

  useEffect(() => {
    if (isDialogOpen) {
      form.reset(phraseToEdit ? {
        id: phraseToEdit.id,
        phrase_key: phraseToEdit.phrase_key,
        language: phraseToEdit.language,
        text: phraseToEdit.text,
      } : {
        phrase_key: "",
        language: "en",
        text: "",
      });
      form.clearErrors();
    }
  }, [isDialogOpen, phraseToEdit, form]);

  const onSubmit = async (values: PhraseFormValues) => {
    setIsLoading(true);
    let error = null;
    const payload = {
      phrase_key: values.phrase_key,
      language: values.language,
      text: values.text,
    };

    if (phraseToEdit) {
      // Update existing phrase
      const { error: dbUpdateError } = await supabaseClient
        .from('receipt_phrases')
        .update(payload)
        .eq('id', phraseToEdit.id);
      error = dbUpdateError;

      if (error) {
        toast.error("Failed to update phrase.", { description: error.message });
      } else {
        toast.success("Phrase updated successfully!");
        setIsDialogOpen(false);
        router.refresh();
      }
    } else {
      // Create new phrase
      const { error: dbInsertError } = await supabaseClient
        .from('receipt_phrases')
        .insert(payload);
      error = dbInsertError;

      if (error) {
        toast.error("Failed to add new phrase.", { description: error.message });
      } else {
        toast.success("New phrase added successfully!");
        setIsDialogOpen(false);
        router.refresh();
      }
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    if (!phraseToEdit?.id) return;

    const { error: dbDeleteError } = await supabaseClient
      .from('receipt_phrases')
      .delete()
      .eq('id', phraseToEdit.id);

    if (dbDeleteError) {
      toast.error("Failed to delete phrase.", { description: dbDeleteError.message });
    } else {
      toast.success("Phrase deleted successfully!");
      setIsConfirmDeleteOpen(false);
      router.refresh();
    }
    setIsLoading(false);
  };

  const openEditDialog = (phrase: typeof initialData[0]) => {
    setPhraseToEdit(phrase);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setPhraseToEdit(null);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (phrase: typeof initialData[0]) => {
    setPhraseToEdit(phrase);
    setIsConfirmDeleteOpen(true);
  };

  const isNewPhrase = !phraseToEdit;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Phrases</CardTitle>
        <CardDescription>Manage localized phrases that appear on your sales receipts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={openAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Phrase
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Text</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData && initialData.length > 0 ? (
              initialData.map((phrase) => (
                <TableRow key={phrase.id}>
                  <TableCell className="font-medium">{phrase.phrase_key}</TableCell>
                  <TableCell>{phrase.language.toUpperCase()}</TableCell>
                  <TableCell>{phrase.text}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(phrase)} title="Edit Phrase">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteConfirm(phrase)} title="Delete Phrase">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No receipt phrases defined.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Add/Edit Phrase Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isNewPhrase ? "Add New Phrase" : `Edit Phrase: ${phraseToEdit?.phrase_key}`}</DialogTitle>
              <DialogDescription>
                {isNewPhrase ? "Enter details for the new receipt phrase." : "Make changes to the receipt phrase here."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phrase_key" className="text-right">
                  Key
                </Label>
                <Input
                  id="phrase_key"
                  type="text"
                  placeholder="thank_you_message"
                  className="col-span-3"
                  {...form.register("phrase_key")}
                  disabled={isLoading || !isNewPhrase}
                />
                {form.formState.errors.phrase_key && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.phrase_key.message}</p>}
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="language" className="text-right">
                  Language
                </Label>
                <Select
                  onValueChange={(value: "en" | "fr") => form.setValue("language", value, { shouldValidate: true })}
                  value={form.watch("language")}
                  disabled={isLoading || !isNewPhrase}
                >
                  <SelectTrigger id="language" className="col-span-3">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.language && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.language.message}</p>}
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="text" className="text-right">
                  Text
                </Label>
                <Textarea
                  id="text"
                  placeholder="Thank you for your purchase!"
                  className="col-span-3"
                  {...form.register("text")}
                  disabled={isLoading}
                />
                {form.formState.errors.text && <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.text.message}</p>}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (isNewPhrase ? "Adding Phrase..." : "Saving Changes...") : (isNewPhrase ? "Add Phrase" : "Save Changes")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent> {/* CORRECTED: Moved closing tag here */}
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete phrase &quot;{phraseToEdit?.phrase_key}&quot;? This action cannot be undone.
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
      </CardContent>
    </Card>
  );
}