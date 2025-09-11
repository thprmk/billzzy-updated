'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

// Define the types for our data
interface VariantValue {
  id: number;
  value: string;
}
interface ProductAttribute {
  id: number;
  name: string;
  values: VariantValue[];
}
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('An error occurred while fetching the data.');
  return res.json();
});

export default function ProductAttributes() {
  const { data: attributes, error, isLoading } = useSWR<ProductAttribute[]>('/api/products/attributes', fetcher);

  // State for the "Add" modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for the "Edit" modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedValues, setEditedValues] = useState<{ value: string }[]>([]);

  // Handler for adding a new attribute
  const handleAddAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttributeName.trim()) {
      toast.error('Attribute name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/products/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAttributeName }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add attribute');
      }
      const newAttribute = await response.json();
      toast.success(`Attribute '${newAttribute.name}' added successfully!`);
      mutate('/api/products/attributes');
      setNewAttributeName('');
      setIsAddModalOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to open and prepare the edit modal
  const openEditModal = (attribute: ProductAttribute) => {
    setEditingAttribute(attribute);
    setEditedName(attribute.name);
    setEditedValues(attribute.values.map(v => ({ value: v.value })));
    setIsEditModalOpen(true);
  };

  // Handler for changing an input in the edit modal's value list
  const handleValueChange = (index: number, value: string) => {
    const newValues = [...editedValues];
    newValues[index].value = value;
    setEditedValues(newValues);
  };

  // Handler to add a new blank value input in the edit modal
  const addValueInput = () => {
    setEditedValues([...editedValues, { value: '' }]);
  };

  // Handler to remove a value input in the edit modal
  const removeValueInput = (index: number) => {
    const newValues = editedValues.filter((_, i) => i !== index);
    setEditedValues(newValues);
  };

  // Handler to submit the updated attribute
  const handleUpdateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttribute) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/products/attributes/${editingAttribute.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName, values: editedValues }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update attribute');
      }
      toast.success(`Attribute '${editedName}' updated successfully!`);
      mutate('/api/products/attributes');
      setIsEditModalOpen(false);
      setEditingAttribute(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // --- Render States ---
  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-md">
        <h3 className="font-bold">Failed to load attributes</h3>
        <p>Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <>
      {/* Main Page Content */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Product Attributes</h2>
            <p className="text-sm text-gray-500">Manage the attributes used for your product variants.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Attribute
          </button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attribute Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Values</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attributes && attributes.length > 0 ? (
                attributes.map((attr) => (
                  <tr key={attr.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attr.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-2 max-w-md">
                        {attr.values.map((val) => (
                          <span key={val.id} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{val.value}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openEditModal(attr)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                      <button className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No attributes found. Click 'Add Attribute' to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Attribute Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Attribute</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleAddAttribute}>
              <div>
                <label htmlFor="attributeName" className="block text-sm font-medium text-gray-700">Attribute Name</label>
                <input
                  type="text"
                  id="attributeName"
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                  placeholder="e.g., Material, Storage"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">{isSubmitting ? 'Adding...' : 'Add Attribute'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attribute Modal */}
      {isEditModalOpen && editingAttribute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Edit Attribute</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleUpdateAttribute} className="space-y-6">
              <div>
                <label htmlFor="editedAttributeName" className="block text-sm font-medium text-gray-700">Attribute Name</label>
                <input
                  type="text"
                  id="editedAttributeName"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Values</label>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {editedValues.map((val, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={val.value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                        placeholder="e.g., Small, Red, 128GB"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button type="button" onClick={() => removeValueInput(index)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addValueInput} className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Add another value</button>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}