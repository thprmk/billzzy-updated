"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { toast } from "react-toastify"
import type React from "react"

// --- TYPESCRIPT INTERFACES ---
interface Category {
  id: number
  name: string
}

// This is the shape of a single variant object
interface Variant {
  SKU: string
  netPrice: number
  sellingPrice: number
  quantity: number
  size?: string
  color?: string
}

interface ProductFormProps {
  // We won't handle editing boutique products in this step to keep it simple.
  // The logic for that is more complex.
  initialData?: {
    id?: number
    name: string
    SKU: string
    netPrice: number
    sellingPrice: number
    quantity: number
    categoryId?: number
  }
  categories: Category[]
}

// --- THE COMPONENT ---
export default function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // --- STATE MANAGEMENT ---

  // 1. Product Type Switch (you already had this, but we'll use 'STANDARD' and 'BOUTIQUE' to match our enum)
  const [productType, setProductType] = useState("STANDARD")

  // 2. State for the parent product info (name and category)
  const [parentData, setParentData] = useState({
    name: initialData?.name || "",
    categoryId: initialData?.categoryId || "",
  })

  // 3. State for the STANDARD product fields
  const [standardData, setStandardData] = useState({
    SKU: initialData?.SKU || "",
    netPrice: initialData?.netPrice || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    quantity: initialData?.quantity || 0,
  })
  
  // 4. NEW: State for the array of variants for a BOUTIQUE product
  const [variants, setVariants] = useState<Variant[]>([
    // Start with one empty variant row by default
    { SKU: "", netPrice: 0, sellingPrice: 0, quantity: 0, size: "", color: "" }
  ])

  // --- HANDLER FUNCTIONS ---

  const handleParentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setParentData(prev => ({ ...prev, [name]: value }))
  }

  const handleStandardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setStandardData(prev => ({
      ...prev,
      [name]: name === "SKU" ? value.toUpperCase() : value,
    }))
  }
  
  // NEW: Handler to update a specific variant in the array
  const handleVariantChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const updatedVariants = [...variants]
    updatedVariants[index] = { 
      ...updatedVariants[index], 
      [name]: name === "SKU" ? value.toUpperCase() : value 
    }
    setVariants(updatedVariants)
  }

  // NEW: Handler to add a new empty variant row
  const addVariant = () => {
    setVariants([...variants, { SKU: "", netPrice: 0, sellingPrice: 0, quantity: 0, size: "", color: "" }])
  }

  // NEW: Handler to remove a variant row
  const removeVariant = (index: number) => {
    if (variants.length > 1) { // Prevent removing the last row
      const updatedVariants = variants.filter((_, i) => i !== index)
      setVariants(updatedVariants)
    }
  }
  
  // UPDATED: The main submission logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    let submissionData: any;

    if (productType === 'BOUTIQUE') {
      submissionData = {
        name: parentData.name,
        categoryId: parentData.categoryId ? Number(parentData.categoryId) : null,
        productType: 'BOUTIQUE',
        variants: variants.map(v => ({
          ...v,
          netPrice: Number(v.netPrice),
          sellingPrice: Number(v.sellingPrice),
          quantity: Number(v.quantity)
        }))
      }
    } else { // STANDARD product
      submissionData = {
        name: parentData.name,
        categoryId: parentData.categoryId ? Number(parentData.categoryId) : null,
        productType: 'STANDARD',
        ...standardData,
        netPrice: Number(standardData.netPrice),
        sellingPrice: Number(standardData.sellingPrice),
        quantity: Number(standardData.quantity)
      }
    }

    try {
      // For now, this form only handles creating new products. Editing is a future step.
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to save product")
        return
      }

      toast.success("Product was Added Successfully")
      router.push("/products/view")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  // --- JSX ---
  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Create Product</h1>
          <p className="text-sm text-gray-600 mt-1">Add a new product to your inventory</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Product Type */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900">Product Type</h3>
                  <p className="text-sm text-gray-500 mt-1">Choose 'Boutique' for products with variants like size or color.</p>
                </div>
                <div className="w-48">
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="BOUTIQUE">Boutique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Basic Information (Same for both types) */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Product Name</label>
                  <Input name="name" value={parentData.name} onChange={handleParentChange} required placeholder="e.g., 'Classic Crew T-Shirt'" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <Select
  name="categoryId"
  value={String(parentData.categoryId)}
  onValueChange={(value) => {
    // If the user selects our special "none" value, we set the actual state to an empty string.
    const actualValue = value === "none" ? "" : value;
    handleParentChange({ target: { name: 'categoryId', value: actualValue } } as any);
  }}
>
  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="none">None</SelectItem> {/* This is the corrected line */}
    {categories.map((category) => (
      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
                </div>
              </div>
            </div>

            {/* CONDITIONAL SECTIONS: Show one or the other based on productType */}
            
            {productType === 'STANDARD' ? (
              // --- STANDARD PRICING & INVENTORY ---
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                <h3 className="text-base font-medium text-gray-900 mb-4">Pricing & Inventory</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">SKU</label>
                    <Input name="SKU" value={standardData.SKU} onChange={handleStandardChange} required placeholder="SKU-001" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Net Price</label>
                    <Input type="number" name="netPrice" value={standardData.netPrice} onChange={handleStandardChange} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Selling Price</label>
                    <Input type="number" name="sellingPrice" value={standardData.sellingPrice} onChange={handleStandardChange} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                    <Input type="number" name="quantity" value={standardData.quantity} onChange={handleStandardChange} required placeholder="0" />
                  </div>
                </div>
              </div>
            ) : (
              // --- NEW BOUTIQUE VARIANTS SECTION ---
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Product Variants</h3>
                    <p className="text-sm text-gray-500 mt-1">Add each unique combination of size, color, etc.</p>
                  </div>
                  <Button type="button" onClick={addVariant}>Add Variant</Button>
                </div>
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border rounded-lg bg-gray-50/80">
                      {/* Variant Inputs */}
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-xs font-medium text-gray-600">SKU</label>
                        <Input name="SKU" value={variant.SKU} onChange={(e) => handleVariantChange(index, e)} required placeholder="SKU-001-S" />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-xs font-medium text-gray-600">Size</label>
                        <Input name="size" value={variant.size} onChange={(e) => handleVariantChange(index, e)} placeholder="S, M, L" />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-xs font-medium text-gray-600">Color</label>
                        <Input name="color" value={variant.color} onChange={(e) => handleVariantChange(index, e)} placeholder="Red" />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-xs font-medium text-gray-600">Net Price</label>
                        <Input type="number" name="netPrice" value={variant.netPrice} onChange={(e) => handleVariantChange(index, e)} required placeholder="0.00" />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-xs font-medium text-gray-600">Selling Price</label>
                        <Input type="number" name="sellingPrice" value={variant.sellingPrice} onChange={(e) => handleVariantChange(index, e)} required placeholder="0.00" />
                      </div>
                      <div className="flex items-end space-x-2 md:col-span-1">
                        <div className="flex-grow space-y-1">
                            <label className="text-xs font-medium text-gray-600">Stock</label>
                            <Input type="number" name="quantity" value={variant.quantity} onChange={(e) => handleVariantChange(index, e)} required placeholder="0" />
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeVariant(index)} disabled={variants.length <= 1}>
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50/50">
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Product"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// A simple Trash icon component to be used in the button.
// You might already have an icon library, but this is for completeness.
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}