"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { toast } from "react-toastify"
import type React from "react"

interface Category {
  id: number
  name: string
}

interface ProductFormProps {
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

export default function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [productType, setProductType] = useState("standard")
  const [boutiqueData, setBoutiqueData] = useState({ size: "", color: "" })
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    SKU: initialData?.SKU || "",
    netPrice: initialData?.netPrice || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    quantity: initialData?.quantity || 0,
    categoryId: initialData?.categoryId || "",
  })

  const resetForm = () => {
    setFormData({
      name: "",
      SKU: "",
      netPrice: "",
      sellingPrice: "",
      quantity: "",
      categoryId: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const submissionData = {
      ...formData,
      netPrice: Number(formData.netPrice),
      sellingPrice: Number(formData.sellingPrice),
      quantity: Number(formData.quantity),
      categoryId: formData.categoryId ? Number(formData.categoryId) : null,
      ...(productType === "boutique" && {
        size: boutiqueData.size || null,
        color: boutiqueData.color || null,
      }),
    }

    try {
      const url = initialData?.id ? `/api/products/${initialData.id}` : "/api/products"
      const response = await fetch(url, {
        method: initialData?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to save product")
        toast.error(data.error || "Failed to save product")
        return
      }

      setSuccess("Product was Added Successfully")
      resetForm()
      router.push("/products/view")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
      const errorMessage = error.message || "Failed to save product"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "SKU" ? value.toUpperCase() : value,
    }))
  }

  const handleBoutiqueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBoutiqueData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex-1 bg-gray-50/50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                {initialData?.id ? "Edit Product" : "Create Product"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {initialData?.id ? "Update product information" : "Add a new product to your inventory"}
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mb-4 lg:mb-6 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm font-medium">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 lg:mb-6 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Product Type */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">Product Type</h3>
                  <p className="text-sm text-gray-500 mt-1">Choose the type of product</p>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={productType} onValueChange={setProductType}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="boutique">Boutique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Product Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-10 text-sm"
                    placeholder="Enter product name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <Select
                    value={String(formData.categoryId)}
                    onValueChange={(value) => {
                      const newCategoryId = value === "none" ? "" : value
                      setFormData((prev) => ({ ...prev, categoryId: newCategoryId }))
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Pricing & Inventory</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">SKU</label>
                  <Input
                    name="SKU"
                    value={formData.SKU}
                    onChange={handleChange}
                    required
                    className="h-10 text-sm"
                    placeholder="SKU-001"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Net Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <Input
                      type="number"
                      name="netPrice"
                      value={formData.netPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                      className="h-10 text-sm pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Selling Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <Input
                      type="number"
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                      className="h-10 text-sm pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
                  <Input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0"
                    required
                    className="h-10 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Boutique Details */}
            {productType === "boutique" && (
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-blue-50/30">
                <h3 className="text-base font-medium text-gray-900 mb-1">Boutique Attributes</h3>
                <p className="text-sm text-gray-600 mb-4">Additional styling options for boutique products</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Size</label>
                    <Input
                      name="size"
                      value={boutiqueData.size}
                      onChange={handleBoutiqueChange}
                      placeholder="S, M, L or 38, 40, 42"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Color</label>
                    <Input
                      name="color"
                      value={boutiqueData.color}
                      onChange={handleBoutiqueChange}
                      placeholder="Red, Blue, Floral Print"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm text-gray-500 order-2 sm:order-1">
                  {initialData?.id ? "Last updated" : "All required fields must be filled"}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-1 sm:order-2">
                  <Button type="button" variant="secondary" onClick={() => router.back()} className="h-10 px-4 text-sm">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="h-10 px-6 text-sm font-medium">
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        {initialData?.id ? "Updating..." : "Creating..."}
                      </div>
                    ) : (
                      <>{initialData?.id ? "Update Product" : "Create Product"}</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
