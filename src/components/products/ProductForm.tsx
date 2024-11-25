'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { toast } from 'react-toastify';

interface Category {
  id: number;
  name: string;
}

interface ProductFormProps {
  initialData?: {
    id?: number;
    name: string;
    SKU: string;
    netPrice: number;
    sellingPrice: number;
    quantity: number;
    categoryId?: number;
  };
  categories: Category[];
}

export default function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    SKU: initialData?.SKU || '',
    netPrice: initialData?.netPrice || 0,
    sellingPrice: initialData?.sellingPrice || 0,
    quantity: initialData?.quantity || 0,
    categoryId: initialData?.categoryId || '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      SKU: '',
      netPrice: '',
      sellingPrice: '',
      quantity: '',
      categoryId: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = initialData?.id ? `/api/products/${initialData.id}` : '/api/products';

      const response = await fetch(url, {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          netPrice: Number(formData.netPrice),
          sellingPrice: Number(formData.sellingPrice),
          quantity: Number(formData.quantity),
          categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save product');
        toast.error(data.error || 'Failed to save product');
        return;
      }
        setSuccess('Product was Added Successfully')
        resetForm();

        router.refresh();
      
      return data;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save product';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6  flex flex-col  w-[800px]">

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2  gap-12">
        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="SKU"
          name="SKU"
          value={formData.SKU}
          onChange={handleChange}
          required
        />

        <Input
          label="Net Price"
          type="number"
          name="netPrice"
          value={formData.netPrice}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />

        <Input
          label="Selling Price"
          type="number"
          name="sellingPrice"
          value={formData.sellingPrice}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />

        <Input
          label="Quantity"
          type="number"
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
          min="0"
          required
        />

        <Select
          label="Category"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          {initialData?.id ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </form>
  );
}