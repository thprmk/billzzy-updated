'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Button } from '../ui/Button'; // Assuming you have a custom Button component
import { Input } from '../ui/Input';   // Assuming you have a custom Input component

// --- TYPE DEFINITIONS ---
interface Attribute {
  id: number;
  name: string;
}
interface ProductType {
  id: number;
  name:string;
  attributes: Attribute[];
}
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch data.');
  return res.json();
});

export default function ProductTypes() {
  const { data: productTypes, error, isLoading } = useSWR<ProductType[]>('/api/products/types', fetcher);

  // --- STATE MANAGEMENT for the modal form ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [attributes, setAttributes] = useState([{ name: '' }]); // Start with one empty attribute field

  const [editedTypeName, setEditedTypeName] = useState('');
  const [editedAttributes, setEditedAttributes] = useState([{ name: '' }]);
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editingType, setEditingType] = useState<ProductType | null>(null);



  const openEditModal = (productType: ProductType) => {
    setEditingType(productType);
    setEditedTypeName(productType.name);  // We can reuse the newTypeName state
    setEditedAttributes(productType.attributes.map(attr => ({ name: attr.name })));// And the attributes state
    setIsEditModalOpen(true);
  };

  const handleEditedAttributeChange = (index: number, value: string) => {
    const newAttributes = [...editedAttributes];
    newAttributes[index].name = value;
    setEditedAttributes(newAttributes);
  };
  
  const addEditedAttributeField = () => {
    setEditedAttributes([...editedAttributes, { name: '' }]);
  };
  
  const removeEditedAttributeField = (index: number) => {
    if (editedAttributes.length > 1) {
      setEditedAttributes(editedAttributes.filter((_, i) => i !== index));
    }
  };
  
  
// Corrected handleUpdate function
const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingType) return;

  setIsSubmitting(true);
  // ---> CHANGE THIS LINE <---
  const validAttributes = editedAttributes.filter(attr => attr.name.trim() !== ''); 
  if (validAttributes.length === 0) {
    toast.error("Please add at least one attribute name.");
    setIsSubmitting(false);
    return;
  }

  try {
    const response = await fetch(`/api/products/types/${editingType.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // ---> CHANGE THIS LINE <---
      body: JSON.stringify({ name: editedTypeName, attributes: validAttributes }), 
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update product type.');
    }
    
    // ---> CHANGE THIS LINE <---
    toast.success(`Product type '${editedTypeName}' updated successfully!`); 
    mutate('/api/products/types');
    setIsEditModalOpen(false); // Close the edit modal
    // We don't need resetForm() here, just close the modal
  
  } catch (error: any) {
    toast.error(error.message);
  } finally {
    setIsSubmitting(false);
  }
};

  // --- FORM HANDLERS ---
  const handleAttributeChange = (index: number, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index].name = value;
    setAttributes(newAttributes);
  };

  const addAttributeField = () => {
    setAttributes([...attributes, { name: '' }]);
  };

  const removeAttributeField = (index: number) => {
    if (attributes.length > 1) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setNewTypeName('');
    setAttributes([{ name: '' }]);
    setIsModalOpen(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Filter out any empty attribute fields before submission
    const validAttributes = attributes.filter(attr => attr.name.trim() !== '');
    if (validAttributes.length === 0) {
      toast.error("Please add at least one attribute name.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/products/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName, attributes: validAttributes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product type.');
      }
      
      toast.success(`Product type '${newTypeName}' created successfully!`);
      mutate('/api/products/types'); // Re-fetch the list of product types
      resetForm();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER LOGIC ---
  if (isLoading) return <p>Loading product types...</p>;
  if (error) return <p className="text-red-500">Failed to load product types. Please refresh.</p>;


  // ADD THIS ENTIRE FUNCTION to src/components/settings/ProductTypes.tsx

const handleDelete = async (typeId: number, typeName: string) => {
  // 1. Ask for confirmation before deleting
  if (!window.confirm(`Are you sure you want to delete the "${typeName}" product type? This cannot be undone.`)) {
    return;
  }

  try {
    // 2. Call the new DELETE API endpoint
    const response = await fetch(`/api/products/types/${typeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete product type.');
    }

    toast.success(`Product type "${typeName}" deleted successfully!`);
    // 3. Tell SWR to refresh the list of product types
    mutate('/api/products/types');

  } catch (error: any) {
    toast.error(error.message);
  }
};


  return (
    <>
      {/* Main Page Content */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Product Types</h2>
            <p className="text-sm text-gray-500">Create and manage templates for your products with variants.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Product Type
          </Button>
        </div>

        {/* List of existing product types */}
        <div className="space-y-4">
          {productTypes && productTypes.length > 0 ? (
            productTypes.map(type => (
              <div key={type.id} className="p-4 border border-gray-200 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">{type.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {type.attributes.map(attr => (
                      <span key={attr.id} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {attr.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  {/* We will wire these up in a future step */}
                    <button 
                      onClick={() => openEditModal(type)} // <-- THIS IS THE CHANGE
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium mr-4"
                    >
                      Edit
                    </button>
                  <button 
                    onClick={() => handleDelete(type.id, type.name)} // <-- THIS IS THE CHANGE
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No product types created yet. Click the button to get started.</p>
          )}
        </div>
      </div>

      {/* "Create New Product Type" Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
            <form onSubmit={handleSubmit}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Create New Product Type</h3>
                <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <Input
                  label="Product Type Name"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g., Apparel, Electronics"
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attributes for this Type</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {attributes.map((attr, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder={`Attribute ${index + 1} Name (e.g., Size)`}
                          value={attr.name}
                          onChange={(e) => handleAttributeChange(index, e.target.value)}
                          className="flex-grow"
                        />
                        <button type="button" onClick={() => removeAttributeField(index)} className="text-red-500 hover:text-red-700 p-1" disabled={attributes.length <= 1}>
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="link" onClick={addAttributeField} className="mt-2 text-sm">
                    + Add another attribute
                  </Button>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t pt-4">
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Type'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- "Edit Product Type" Modal --- */}
{isEditModalOpen && editingType && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
      <form onSubmit={handleUpdate}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Edit Product Type</h3>
          <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <Input
            label="Product Type Name"
            value={editedTypeName} 
            onChange={(e) => setEditedTypeName(e.target.value)}
            placeholder="e.g., Apparel, Electronics"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attributes for this Type</label>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {editedAttributes.map((attr, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Attribute ${index + 1} Name (e.g., Size)`}
                    value={attr.name}
                    onChange={(e) => handleEditedAttributeChange(index, e.target.value)}
                    className="flex-grow"
                  />
                  <button type="button" onClick={() => removeEditedAttributeField(index)} className="text-red-500 hover:text-red-700 p-1" disabled={editedAttributes.length <= 1}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="link" onClick={addEditedAttributeField} className="mt-2 text-sm">
              + Add another attribute
            </Button>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t pt-4">
          <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  </div>
)}
    </>
  );
}