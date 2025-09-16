// src/components/expenses/ExpenseForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR, { mutate } from "swr";
import CategoryManager from "./CategoryManager"; // Import the new component

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

// --- Data types ---
interface Category {
  id: number;
  name: string;
}

interface Vendor {
  id: number;
  name: string;
}

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Zod Schema for the form ---
const expenseFormSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number." }).positive("Amount must be positive."),
  categoryId: z.string({ required_error: "Please select a category." }),
  paymentMode: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_CARD", "UPI", "CHEQUE"]),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
  vendorId: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function ExpenseForm({ isOpen, onClose }: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const { data: categories } = useSWR<Category[]>('/api/expenses/categories', fetcher);
  const { data: vendors } = useSWR<Vendor[]>('/api/expenses/vendors', fetcher);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: new Date(),
      paymentMode: "UPI",
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        date: data.date.toISOString(), // Convert date to ISO string for the API
        categoryId: parseInt(data.categoryId, 10),
        vendorId: data.vendorId ? parseInt(data.vendorId, 10) : undefined,
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create expense');
      }

      alert("Expense created successfully!");
      mutate('/api/expenses'); // Re-fetch the expense list
      onClose(); // Close the modal
    } catch (error) {
      console.error(error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Reset form when modal is closed
    if (!isOpen) {
      reset({
        date: new Date(),
        paymentMode: "UPI",
        amount: undefined,
        categoryId: undefined,
        vendorId: undefined,
        notes: "",
      });
    }
  }, [isOpen, reset]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* Date Picker */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="col-span-3 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && <p className="col-span-4 text-red-500 text-sm">{errors.date.message}</p>}
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} className="col-span-3" />
              {errors.amount && <p className="col-span-4 text-red-500 text-sm mt-1 text-right">{errors.amount.message}</p>}
            </div>

            {/* Category */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="categoryId" className="text-right">Category</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="flex-grow">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setIsCategoryModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.categoryId && <p className="col-span-4 text-red-500 text-sm mt-1 text-right">{errors.categoryId.message}</p>}
            </div>

            {/* Vendor */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendorId" className="text-right">Vendor</Label>
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a vendor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={String(vendor.id)}>{vendor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Payment Mode */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMode" className="text-right">Payment</Label>
              <Controller
                name="paymentMode"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Notes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Input id="notes" {...register("notes")} className="col-span-3" />
              {errors.notes && <p className="col-span-4 text-red-500 text-sm mt-1 text-right">{errors.notes.message}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <CategoryManager isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </>
  );
}