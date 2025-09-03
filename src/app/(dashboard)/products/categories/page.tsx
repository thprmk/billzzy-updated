'use client';

import { useState, useEffect, FormEvent } from 'react';
import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-toastify';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPESCRIPT INTERFACES ---
interface Category {
  id: number;
  name: string;
  _count?: {
    products: number;
  };
}

export default function CategoriesPage() {
  // --- STATE MANAGEMENT ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- DATA FETCHING ---
  const fetchCategories = async () => {
    // We set loading to true only if it's the initial fetch
    if (categories.length === 0) {
      setIsLoading(true);
    }
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories.');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      const fetchError = err as Error;
      setError(fetchError.message);
      toast.error(fetchError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- EVENT HANDLERS ---
  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create category.');
      }
      toast.success('Category created successfully!');
      setNewCategoryName('');
      setIsAdding(false);
      await fetchCategories();
    } catch (err) {
      const addError = err as Error;
      toast.error(addError.message);
    }
  };

  const handleEditSubmit = async (categoryId: number) => {
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null);
      return;
    }
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategoryName }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update category.');
      }
      toast.success('Category updated successfully!');
      setEditingCategoryId(null);
      await fetchCategories();
    } catch (err) {
      const editError = err as Error;
      toast.error(editError.message);
    }
  };

  const handleDelete = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete category.');
      }
      toast.success('Category deleted successfully!');
      setCategoryToDelete(null);
      await fetchCategories();
    } catch (err) {
      const deleteError = err as Error;
      toast.error(deleteError.message);
    }
  };

  // --- RENDER LOGIC ---
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }
  
  if (error) {
    return <div className="text-red-500 text-center p-8">{error}</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Product Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Add, edit, and manage your product groups.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search categories..."
              className="w-full md:w-64 pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleAddSubmit} className="p-4 border-b bg-gray-50/50 flex items-center gap-3">
                <Input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter new category name..."
                  className="flex-grow"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save Category</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCategories.length === 0 && !isAdding ? (
                <tr><td colSpan={3} className="text-center py-16 text-gray-500">
                  {searchTerm ? 'No categories match your search.' : 'No categories found. Click "Add Category" to start.'}
                </td></tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="group hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategoryId === category.id ? (
                        <Input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          
                          onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit(category.id)}
                        />
                      ) : (
                        <span className="font-medium text-gray-800">{category.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category._count?.products ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                        {editingCategoryId === category.id ? (
                          <>
                            <Button size="sm" onClick={() => handleEditSubmit(category.id)}>Save</Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}>Edit</Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setCategoryToDelete(category)}
                              disabled={category._count && category._count.products > 0}
                              title={category._count && category._count.products > 0 ? "Cannot delete category with products" : "Delete category"}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIX: The modal now correctly contains its content as children */}
      <Modal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} title="Confirm Deletion">
        <div className="p-6">
          <p className='text-sm text-gray-700'>
            Are you sure you want to delete the category "<strong>{categoryToDelete?.name}</strong>"?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={() => setCategoryToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { if (categoryToDelete) handleDelete(categoryToDelete.id); }}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- HELPER ICONS ---
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}