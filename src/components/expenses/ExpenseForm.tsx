// src/components/expenses/ExpenseForm.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import VendorManager from "./VendorManager"; 
import useSWR, { mutate } from "swr";
import CategoryManager from "./CategoryManager";
import { Expense } from "@/app/(dashboard)/expenses/page";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

interface ParentCategory { id: number; name: string; children: { id: number; name: string; }[]; }
interface Vendor { id: number; name: string; }
interface ExpenseFormProps { isOpen: boolean; onClose: () => void; initialData?: Expense | null; }
const fetcher = (url: string) => fetch(url).then((res) => res.json());
const expenseFormSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  categoryId: z.string({ required_error: "Please select a category." }),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "UPI", "CHEQUE"]),
  notes: z.string().max(500).optional(),
  vendorId: z.string().optional(),
});
type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function ExpenseForm({ isOpen, onClose, initialData }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const isEditMode = !!initialData;

  const { data: categories, isLoading: isCategoriesLoading } = useSWR<ParentCategory[]>(isOpen ? '/api/expenses/categories' : null, fetcher);
  const { data: vendors, isLoading: isVendorsLoading } = useSWR<Vendor[]>(isOpen ? '/api/expenses/vendors' : null, fetcher);
  const isLoadingData = isCategoriesLoading || isVendorsLoading;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
  });

  const flatCategories = useMemo(() => {
    if (!categories) return [];
    return categories.flatMap(parent => [ { id: parent.id, name: parent.name }, ...parent.children.map(child => ({ id: child.id, name: `${parent.name} > ${child.name}` })) ]);
  }, [categories]);

  const watchedCategoryId = watch("categoryId");
  const watchedVendorId = watch("vendorId");
  const watchedPaymentMode = watch("paymentMode");
  const watchedDate = watch("date");

  useEffect(() => {
    if (isOpen && !isLoadingData) {
      if (initialData) {
        reset({ date: new Date(initialData.date), amount: initialData.amount, categoryId: String(initialData.categoryId), paymentMode: initialData.paymentMode as any, notes: initialData.notes || "", vendorId: initialData.vendorId ? String(initialData.vendorId) : undefined, });
      } else {
        reset({ date: new Date(), paymentMode: "UPI" });
      }
    }
  }, [initialData, isOpen, isLoadingData, reset]);
  
  const onSubmit = async (data: ExpenseFormData) => {
    console.log("--- SUBMITTING FORM ---");
    console.log("Form data received from react-hook-form:", data);
    setIsSubmitting(true);
    try {
      const payload = { ...data, date: data.date.toISOString(), categoryId: parseInt(data.categoryId, 10), vendorId: data.vendorId ? parseInt(data.vendorId, 10) : undefined, };
      console.log("Prepared payload to send to API:", payload);
      const url = isEditMode ? `/api/expenses/${initialData!.id}` : '/api/expenses';
      const method = isEditMode ? 'PUT' : 'POST';
      console.log(`Sending ${method} request to ${url}`);
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      console.log("API response received with status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Data:", errorData);
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} expense`);
      }
      alert(`Expense ${isEditMode ? 'updated' : 'created'} successfully!`);
      mutate('/api/expenses');
      onClose();
    } catch (error) {
      console.error("An error occurred in the onSubmit function:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onValidationErrors = (errors: any) => {
    console.error("--- FORM VALIDATION FAILED ---");
    console.error("Validation errors:", errors);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{isEditMode ? 'Edit Expense' : 'Add New Expense'}</DialogTitle></DialogHeader>
          {isLoadingData ? (
            <div className="flex justify-center items-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            // --- THIS IS THE ONLY LINE THAT CHANGED ---
            <form onSubmit={handleSubmit(onSubmit, onValidationErrors)} className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className="col-span-3 justify-start text-left font-normal"> <CalendarIcon className="mr-2 h-4 w-4" /> {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>} </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"> <Calendar mode="single" selected={watchedDate} onSelect={(date) => setValue("date", date!, { shouldValidate: true })} initialFocus /> </PopoverContent>
                </Popover>
                {errors.date && <p className="col-span-4 text-red-500 text-sm text-right">{errors.date.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input id="amount" type="number" step="0.01" {...register("amount")} className="col-span-3" />
                {errors.amount && <p className="col-span-4 text-red-500 text-sm mt-1 text-right">{errors.amount.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Category</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Select onValueChange={(value) => setValue("categoryId", value, { shouldValidate: true })} value={watchedCategoryId}>
                    <SelectTrigger className="flex-grow"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent> {flatCategories.map((cat) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>)} </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsCategoryModalOpen(true)}><Plus className="h-4 w-4" /></Button>
                </div>
                {errors.categoryId && <p className="col-span-4 text-red-500 text-sm mt-1 text-right">{errors.categoryId.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Vendor</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Select onValueChange={(value) => setValue("vendorId", value)} value={watchedVendorId}>
                    <SelectTrigger className="flex-grow"><SelectValue placeholder="Select a vendor (optional)" /></SelectTrigger>
                    <SelectContent> {vendors?.map((vendor) => <SelectItem key={vendor.id} value={String(vendor.id)}>{vendor.name}</SelectItem>)} </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setIsVendorModalOpen(true)}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Payment</Label>
                <Select onValueChange={(value) => setValue("paymentMode", value as any)} value={watchedPaymentMode}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                  <SelectContent> <SelectItem value="CASH">Cash</SelectItem> <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem> <SelectItem value="CREDIT_CARD">Credit Card</SelectItem> <SelectItem value="UPI">UPI</SelectItem> <SelectItem value="CHEQUE">Cheque</SelectItem> </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">Notes</Label>
                <Input id="notes" {...register("notes")} className="col-span-3" />
                {errors.notes && <p className="col-span-4 text-red-500 text-sm mt-1 text-right">{errors.notes.message}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}> {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <CategoryManager isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
      <VendorManager isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} />
    </>
  );
}