"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { toast } from "react-toastify";
import { TrashIcon } from '@heroicons/react/24/outline';


interface FormData {
  name: string;
  categoryId: number | null;
  productTypeTemplateId?: number;
  variants?: Variant[];
  SKU?: string;
  netPrice?: number;
  sellingPrice?: number;
  quantity?: number;
}

interface Category {
  id: number
  name: string
}
interface ProductTypeTemplate {
  id: number
  name: string
  attributes: { id: number, name: string }[]
}
interface Variant {
  SKU: string
  netPrice: number
  sellingPrice: number
  quantity: number
  customAttributes: Record<string, string> 
}
interface ProductFormProps {
  initialData?: any
  categories: Category[]
  productTypes: ProductTypeTemplate[]
}

// --- THE COMPONENT ---
export default function ProductForm({ initialData, categories, productTypes }: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // --- STATE MANAGEMENT ---
  const [name, setName] = useState(initialData?.name || "")
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "")
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<string>('standard')
  const [standardData, setStandardData] = useState({
    SKU: initialData?.SKU || "",
    netPrice: initialData?.netPrice || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    quantity: initialData?.quantity || 0,
  })
  const [variants, setVariants] = useState<Variant[]>([])


// This new version will automatically add the first variant row.

useEffect(() => {
  const isVariantType = selectedProductTypeId !== 'standard';

  if (isVariantType) {
    const activeTemplate = productTypes.find(pt => pt.id === Number(selectedProductTypeId));
    if (activeTemplate) {
      // Create one empty variant based on the template
      const firstVariant: Variant = {
        SKU: "", 
        netPrice: 0, 
        sellingPrice: 0, 
        quantity: 0,
        customAttributes: Object.fromEntries(activeTemplate.attributes.map(attr => [attr.name, ""]))
      };
      // Set the variants state to contain just this single new row
      setVariants([firstVariant]);
    }
  } else {
    // If the user switches back to "Standard", clear the variants list
    setVariants([]);
  }
}, [selectedProductTypeId, productTypes]); // Added productTypes to dependency array

  // --- HANDLER FUNCTIONS ---
  const handleStandardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStandardData(prev => ({ ...prev, [name]: name === 'SKU' ? value.toUpperCase() : value }));
  }
  
  const handleVariantChange = (index: number, fieldName: string, value: string | number) => {
    const updatedVariants = [...variants];
    const variantToUpdate = { ...updatedVariants[index] };
  
    // Use a more explicit structure that TypeScript understands
    if (fieldName === 'SKU') {
      variantToUpdate.SKU = String(value).toUpperCase();
    } else if (fieldName === 'netPrice') {
      variantToUpdate.netPrice = Number(value);
    } else if (fieldName === 'sellingPrice') {
      variantToUpdate.sellingPrice = Number(value);
    } else if (fieldName === 'quantity') {
      variantToUpdate.quantity = Number(value);
    } else {
      // Handle custom attributes
      variantToUpdate.customAttributes = {
        ...variantToUpdate.customAttributes,
        [fieldName]: String(value)
      };
    }
    
    updatedVariants[index] = variantToUpdate;
    setVariants(updatedVariants);
  };
  
  const addVariant = () => {
    const activeTemplate = productTypes.find(pt => pt.id === Number(selectedProductTypeId));
    if (!activeTemplate) return;

    const newEmptyVariant: Variant = {
      SKU: "", netPrice: 0, sellingPrice: 0, quantity: 0,
      customAttributes: Object.fromEntries(activeTemplate.attributes.map(attr => [attr.name, ""]))
    };
    setVariants([...variants, newEmptyVariant]);
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    let submissionData: FormData;
    const isStandard = selectedProductTypeId === 'standard';
    if (isStandard) {
      submissionData = {
        name,
        categoryId: categoryId ? Number(categoryId) : null,
        SKU: standardData.SKU,
        netPrice: Number(standardData.netPrice),
        sellingPrice: Number(standardData.sellingPrice),
        quantity: Number(standardData.quantity)
      };
    } else {// Product with Variants
      submissionData = {
        name,
        categoryId: categoryId ? Number(categoryId) : null,
        productTypeTemplateId: Number(selectedProductTypeId),
        variants: variants.map(v => ({
            ...v,
            netPrice: Number(v.netPrice),
            sellingPrice: Number(v.sellingPrice),
            quantity: Number(v.quantity)
        }))
      };
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to save product");
      }
      toast.success("Product was Added Successfully");
      router.push("/products/view");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // --- DERIVED STATE FOR RENDERING ---
  const isVariantProduct = selectedProductTypeId !== 'standard';
  const activeTemplate = isVariantProduct ? productTypes.find(pt => pt.id === Number(selectedProductTypeId)) : null;

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Create Product</h1>
          <p className="text-sm text-gray-600 mt-1">Add a new product to your inventory</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            
            {/* --- UPDATED Product Type Section --- */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <h3 className="text-base font-medium text-gray-900 mb-2">Product Type</h3>
              <p className="text-sm text-gray-500 mb-4">Choose 'Standard' for a single item, or a custom type for items with variants.</p>
              <Select value={selectedProductTypeId} onValueChange={setSelectedProductTypeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (Single Product)</SelectItem>
                  {productTypes.map((pt) => (
                    <SelectItem key={pt.id} value={String(pt.id)}>{pt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Basic Information */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Product Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g., 'Classic Crew T-Shirt'" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">Category</label>
                  <Select value={String(categoryId)} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {isVariantProduct ? (
              // DYNAMIC VARIANTS SECTION 
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">Product Variants</h3>
                    <p className="text-sm text-gray-500 mt-1">Add each unique product combination.</p>
                  </div>
                  <Button type="button" onClick={addVariant}>Add Variant</Button>
                </div>
                <div className="space-y-4">
                  {/* Table Header */}
                  {variants.length > 0 && activeTemplate && (
                    <div className="hidden md:grid grid-cols-12 gap-3 px-1 text-xs font-medium text-gray-600">
                      {activeTemplate.attributes.map(attr => <div key={attr.id} className="col-span-2">{attr.name}</div>)}
                      <div className="col-span-2">SKU</div>
                      <div className="col-span-1">Net Price</div>
                      <div className="col-span-2">Selling Price</div>
                      <div className="col-span-1">Stock</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}
                  {/* Table Rows */}
                  {variants.map((variant, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border p-3 rounded-lg">
                      {activeTemplate?.attributes.map(attr => (
                        <div key={attr.id} className="col-span-full md:col-span-2">
                          <label className="text-xs font-medium text-gray-800 md:hidden">{attr.name}</label>
                          <Input name={attr.name} value={variant.customAttributes[attr.name]} onChange={(e) => handleVariantChange(index, attr.name, e.target.value)} placeholder={attr.name} required />
                        </div>
                      ))}
                      <div className="col-span-full md:col-span-2"><label className="text-xs font-medium text-gray-800 md:hidden">SKU</label><Input name="SKU" value={variant.SKU} onChange={(e) => handleVariantChange(index, 'SKU', e.target.value)} required placeholder="SKU"/></div>
                      <div className="col-span-full md:col-span-1"><label className="text-xs font-medium text-gray-800 md:hidden">Net Price</label><Input type="number" name="netPrice" value={variant.netPrice} onChange={(e) => handleVariantChange(index, 'netPrice', e.target.value)} required placeholder="0"/></div>
                      <div className="col-span-full md:col-span-2"><label className="text-xs font-medium text-gray-800 md:hidden">Selling Price</label><Input type="number" name="sellingPrice" value={variant.sellingPrice} onChange={(e) => handleVariantChange(index, 'sellingPrice', e.target.value)} required placeholder="0.00"/></div>
                      <div className="col-span-full md:col-span-1"><label className="text-xs font-medium text-gray-800 md:hidden">Stock</label><Input type="number" name="quantity" value={variant.quantity} onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)} required placeholder="0"/></div>
                      <div className="col-span-full md:col-span-1 flex justify-end">
                      <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  disabled={variants.length <= 1}
                  className="p-1 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                >
                  <TrashIcon 
                    className="h-5 w-5" 
                    strokeWidth={1.5} // <-- Add this to make the lines thinner and more minimal
                  />
                </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // --- STANDARD PRICING & INVENTORY SECTION ---
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-gray-200">
                <h3 className="text-base font-medium text-gray-900 mb-4">Pricing & Inventory</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium text-gray-800">SKU</label><Input name="SKU" value={standardData.SKU} onChange={handleStandardChange} required placeholder="SKU-001" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-gray-800">Net Price</label><Input type="number" name="netPrice" value={standardData.netPrice} onChange={handleStandardChange} required placeholder="0.00" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-gray-800">Selling Price</label><Input type="number" name="sellingPrice" value={standardData.sellingPrice} onChange={handleStandardChange} required placeholder="0.00" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-gray-800">Stock Quantity</label><Input type="number" name="quantity" value={standardData.quantity} onChange={handleStandardChange} required placeholder="0" /></div>
                </div>
              </div>
            )}
            
            <div className="px-4 sm:px-6 py-4 bg-gray-50/50 border-t border-gray-200">
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