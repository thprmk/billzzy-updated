
// src/components/expenses/ExpenseForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR, { mutate } from "swr";
import VendorManager from "./VendorManager";
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

interface ParentCategory {
  id: number;
  name: string;
  children: { id: number; name: string }[];
}

interface Vendor {
  id: number;
  name: string;
}

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Expense | null;
}

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
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newVendor, setNewVendor] = useState("");
  const categoryListRef = useRef<HTMLDivElement | null>(null);
  const isEditMode = !!initialData;

  const { data: categories, isLoading: isCategoriesLoading, mutate: refreshCategories } = useSWR<ParentCategory[]>(
    isOpen ? "/api/expenses/categories" : null,
    fetcher
  );

  const { data: vendors, isLoading: isVendorsLoading, mutate: refreshVendors } = useSWR<Vendor[]>(
    isOpen ? "/api/expenses/vendors" : null,
    fetcher
  );

  const isLoadingData = isCategoriesLoading || isVendorsLoading;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<ExpenseFormData>({ resolver: zodResolver(expenseFormSchema) });

  const flatCategories = useMemo(() => {
    if (!categories) return [];
    return categories.flatMap((parent) => [
      { id: parent.id, name: parent.name },
      ...parent.children.map((child) => ({
        id: child.id,
        name: `${parent.name} > ${child.name}`,
      })),
    ]);
  }, [categories]);

  const watchedCategoryId = watch("categoryId");
  const watchedVendorId = watch("vendorId");
  const watchedPaymentMode = watch("paymentMode");
  const watchedDate = watch("date");

  useEffect(() => {
    if (isOpen && !isLoadingData) {
      if (initialData) {
        reset({
          date: new Date(initialData.date),
          amount: initialData.amount,
          categoryId: String(initialData.categoryId),
          paymentMode: initialData.paymentMode as any,
          notes: initialData.notes || "",
          vendorId: initialData.vendorId ? String(initialData.vendorId) : undefined,
        });
      } else {
        reset({ date: new Date(), paymentMode: "UPI" });
      }
    }
  }, [initialData, isOpen, isLoadingData, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        date: data.date.toISOString(),
        categoryId: parseInt(data.categoryId, 10),
        vendorId: data.vendorId ? parseInt(data.vendorId, 10) : undefined,
      };

      const url = isEditMode ? `/api/expenses/${initialData!.id}` : "/api/expenses";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save expense");

      alert(`Expense ${isEditMode ? "updated" : "created"} successfully!`);
      mutate("/api/expenses");
      onClose();
    } catch (error) {
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await fetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });

      setNewCategory("");
      await refreshCategories();

      if (categoryListRef.current) {
        setTimeout(() => {
          categoryListRef.current!.scrollTop = categoryListRef.current!.scrollHeight;
        }, 200);
      }
    } catch (error) {
      alert("Failed to add category");
    }
  };

  const handleAddVendor = async () => {
    if (!newVendor.trim()) return;
    try {
      const res = await fetch(`${window.location.origin}/api/expenses/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVendor }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || "Failed to add vendor");
      }

      const addedVendor = await res.json();
      setNewVendor("");
      await refreshVendors();
      setValue("vendorId", String(addedVendor.id), { shouldValidate: true });
    } catch (err: any) {
      alert(`Failed to add vendor: ${err.message}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#5A4FCF]">
              {isEditMode ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>

          {isLoadingData ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-[#5A4FCF]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
              {/* Date */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="col-span-3 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchedDate}
                      onSelect={(date) => setValue("date", date!, { shouldValidate: true })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register("amount")}
                  className="col-span-3 focus:ring-2 focus:ring-[#5A4FCF]"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Category</Label>
                <div className="col-span-3 flex flex-col gap-2">
                  <Select
                    onValueChange={(value) => setValue("categoryId", value, { shouldValidate: true })}
                    value={watchedCategoryId}
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent ref={categoryListRef}>
                      {flatCategories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <div className="border-t mt-2 pt-2 flex gap-2 px-2">
                        <Input
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="New category..."
                          className="h-8"
                        />
                        <Button
                          type="button"
                          onClick={handleAddCategory}
                          className="bg-[#5A4FCF] text-white px-3"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vendor */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Vendor</Label>
                <div className="col-span-3 flex flex-col gap-2">
                  <Select
                    onValueChange={(value) => setValue("vendorId", value, { shouldValidate: true })}
                    value={watchedVendorId}
                    key={vendors?.length} // re-render on vendor list update
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Select a vendor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={String(vendor.id)}>
                          {vendor.name}
                        </SelectItem>
                      ))}

                      <div className="border-t mt-2 pt-2 flex gap-2 px-2">
                        <Input
                          value={newVendor}
                          onChange={(e) => setNewVendor(e.target.value)}
                          placeholder="New vendor..."
                          className="h-8"
                        />
                        <Button type="button" onClick={handleAddVendor} className="bg-[#5A4FCF] text-white px-3">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Payment</Label>
                <Select onValueChange={(value) => setValue("paymentMode", value as any)} value={watchedPaymentMode}>
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
              </div>

              {/* Notes */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Input id="notes" {...register("notes")} className="col-span-3" />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#5A4FCF] text-white hover:opacity-90"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor Modal stays as is */}
      <VendorManager isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} />
    </>
  );
}
