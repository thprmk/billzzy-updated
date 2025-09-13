// src/components/invoices/InvoiceForm.tsx
"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { toast } from 'react-toastify';
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

// Type for a single line item
type InvoiceItem = {
  description: string
  quantity: number
  unitPrice: number
  total: number
  productId?: string
}

// Define the initial state for the form, making it easy to reset
const initialInvoiceDetails = {
  customerInfo: "",
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  notes: "",
  taxRate: 0,
  status: "DRAFT",
  taxType: "PERCENTAGE", // Can be 'PERCENTAGE' or 'FIXED'
}
const initialItems: InvoiceItem[] = [{ description: "", quantity: 1, unitPrice: 0, total: 0 }]

export function InvoiceForm() {
  const [invoiceDetails, setInvoiceDetails] = useState(initialInvoiceDetails)
  const [items, setItems] = useState<InvoiceItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)

  const [logoPreview, setLogoPreview] = useState<string | null>(null); 
  const [logoFile, setLogoFile] = useState<File | null>(null);     
  
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file); // Store the actual file
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string); // Set the preview URL
      };
      reader.readAsDataURL(file);
    }
  };

  // Generic handler for all input, textarea, and select fields
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setInvoiceDetails((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Handler for changes within the items table
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    const itemToUpdate = { ...newItems[index] }

    if (field === "description" || field === "productId") {
      itemToUpdate[field] = value as string
    } else {
      itemToUpdate[field] = Number(value) || 0 // Default to 0 if input is invalid
    }

    itemToUpdate.total = itemToUpdate.quantity * itemToUpdate.unitPrice
    newItems[index] = itemToUpdate
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { ...initialItems[0] }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const resetForm = () => {
    setInvoiceDetails(initialInvoiceDetails)
    setItems([{ ...initialItems[0] }])
  }

  // The calculation hook, now with logic for both tax types
  const { subTotal, totalTax, totalAmount } = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.total || 0), 0)
    let totalTax = 0

    if (invoiceDetails.taxType === "PERCENTAGE") {
      const taxRate = Number(invoiceDetails.taxRate) / 100
      totalTax = subTotal * taxRate
    } else {
      // taxType is 'FIXED'
      totalTax = Number(invoiceDetails.taxRate)
    }

    const totalAmount = subTotal + totalTax
    return { subTotal, totalTax, totalAmount }
  }, [items, invoiceDetails.taxRate, invoiceDetails.taxType])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)


    const formData = new FormData();

    if (logoFile) {
      formData.append('logo', logoFile);
    }

    const payload = {
      ...invoiceDetails,
      items: items,
      notes: `${invoiceDetails.customerInfo}\n\n${invoiceDetails.notes}`,
      subTotal,
      totalTax,
      totalAmount,
    };
    formData.append('data', JSON.stringify(payload));

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
       
        body: formData,
      })

      const data = await response.json();

      if (!response.ok) {
        // Use the error message from the API, or a fallback
        throw new Error(data.error || 'Failed to create invoice');
      }

      toast.success(`Invoice ${data.invoiceNumber} created successfully!`);      
      resetForm();

      setLogoFile(null);
      setLogoPreview(null);

    } catch (error) {
      let errorMessage = "An error occurred. Please try again."
      if (error instanceof Error) errorMessage = error.message
      console.error(error)
      alert(errorMessage)

      toast.error(errorMessage);

    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-pretty">Create Invoice</h1>
        <p className="text-sm text-muted-foreground">
          Fill in billing details, add items, and review totals before saving.
        </p>
      </header>

      {/* Invoice Details */}
      <Card className="p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm bg-white">


      <div className="mb-6">
            <label htmlFor="logo-upload" className="block text-sm font-medium text-muted-foreground mb-2">
              Company Logo (Optional)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-md border border-dashed flex items-center justify-center bg-gray-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">Preview</span>
                )}
              </div>
              <Input
                id="logo-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleLogoChange}
                className="flex-1"
              />
            </div>
        </div>


        <div className="mb-4">
          <h2 className="text-lg font-semibold">Invoice Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bill To */}
          <div>
            <label htmlFor="customerInfo" className="block text-sm font-medium text-muted-foreground">
              Bill To
            </label>
            <textarea
              id="customerInfo"
              name="customerInfo"
              rows={5}
              value={invoiceDetails.customerInfo}
              onChange={handleDetailsChange}
              placeholder={"Customer Name\nCustomer Address"}
              className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
              required
              autoFocus
            />
          </div>

          {/* Dates + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="issueDate" className="block text-sm font-medium text-muted-foreground">
                Issue Date
              </label>
              <input
                type="date"
                id="issueDate"
                name="issueDate"
                value={invoiceDetails.issueDate}
                onChange={handleDetailsChange}
                required
                className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-muted-foreground">
                Due Date
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={invoiceDetails.dueDate}
                onChange={handleDetailsChange}
                required
                min={invoiceDetails.issueDate}
                className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
              />
            </div>

          <div className="sm:col-span-2">
            <label htmlFor="status" className="block text-sm font-medium text-muted-foreground">
              Status
            </label>
            <Select
              name="status"
              value={invoiceDetails.status}
              onValueChange={(value) => {
                // Create a fake event object that our handleDetailsChange function can understand
                const syntheticEvent = {
                  target: { name: 'status', value: value }
                } as React.ChangeEvent<HTMLSelectElement>;
                handleDetailsChange(syntheticEvent);
              }}
            >
              <SelectTrigger className="mt-2" aria-label="Invoice status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
            </div>

          </div>
        </div>
      </Card>

      {/* Items */}
      <Card className="p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <Button type="button" onClick={addItem} variant="outline" disabled={isLoading}>
            Add Item
          </Button>
        </div>

        <div className="space-y-2">
          {/* Column headers (mobile-hidden) */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-2 pb-1 text-xs uppercase tracking-wide text-muted-foreground">
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1" />
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 rounded-lg border border-gray-200 bg-white/60 p-2 md:p-3 hover:bg-white transition"
            >
              <div className="col-span-12 md:col-span-6">
                <label className="md:hidden block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, "description", e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <label className="md:hidden block text-xs font-medium text-muted-foreground mb-1">Qty</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <label className="md:hidden block text-xs font-medium text-muted-foreground mb-1">Price</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-right text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
                />
              </div>

              <div className="col-span-10 md:col-span-1 flex md:block items-center justify-between">
                <span className="md:hidden text-xs font-medium text-muted-foreground">Total</span>
                <span className="font-semibold font-mono tabular-nums ml-auto">{item.total.toFixed(2)}</span>
              </div>

              <div className="col-span-2 md:col-span-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1 || isLoading}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                  aria-label="Remove item"
                  title="Remove item"
                >
                  <span aria-hidden>&times;</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notes & Totals */}
      <Card className="p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={5}
              value={invoiceDetails.notes}
              onChange={handleDetailsChange}
              placeholder="Additional notes or payment terms"
              className="mt-2 block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
            />
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex justify-between w-full max-w-sm">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold font-mono tabular-nums">{subTotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between w-full max-w-sm gap-3">
              <span className="text-sm text-muted-foreground">
                Tax ({invoiceDetails.taxType === "PERCENTAGE" ? "%" : "Fixed"})
              </span>

              <div className="flex items-stretch">
                <input
                  type="number"
                  name="taxRate"
                  inputMode="decimal"
                  min={0}
                  step={invoiceDetails.taxType === "PERCENTAGE" ? "0.01" : "0.01"}
                  value={invoiceDetails.taxRate}
                  onChange={handleDetailsChange}
                  className="w-24 rounded-l-md border border-gray-200 bg-white px-2 py-1.5 text-right text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition"
                  aria-label="Tax value"
                />
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setInvoiceDetails((prev) => ({ ...prev, taxType: "PERCENTAGE" }))}
                    className={`px-3 py-1.5 border text-sm rounded-r-none ${
                      invoiceDetails.taxType === "PERCENTAGE"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                    aria-pressed={invoiceDetails.taxType === "PERCENTAGE"}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceDetails((prev) => ({ ...prev, taxType: "FIXED" }))}
                    className={`px-3 py-1.5 border text-sm rounded-r-md ${
                      invoiceDetails.taxType === "FIXED"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                    aria-pressed={invoiceDetails.taxType === "FIXED"}
                  >
                    Fixed
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between w-full max-w-sm">
              <span className="text-sm text-muted-foreground">Total Tax</span>
              <span className="font-semibold font-mono tabular-nums">{totalTax.toFixed(2)}</span>
            </div>

            <div className="flex justify-between w-full max-w-sm text-xl font-bold border-t pt-3 mt-1">
              <span>Total</span>
              <span className="font-mono tabular-nums">{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-t">
        <div className="max-w-4xl mx-auto px-0 py-4 flex items-center justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : `Save ${invoiceDetails.status === "DRAFT" ? "Draft" : "as Paid"}`}
          </Button>
        </div>
      </div>



    </form>
  )
}
