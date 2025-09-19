// src/components/expenses/CategoryManager.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react"; // Import Trash2 icon
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

interface ParentCategory { 
  id: number; 
  name: string;
  children: { id: number; name: string; }[];
}
interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const [categoryName, setCategoryName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We only fetch when the modal is open for better performance
  const { data: categories, isLoading } = useSWR<ParentCategory[]>(isOpen ? '/api/expenses/categories' : null, fetcher);

  // Your existing handleSubmit function is correct
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError("Category name cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName, parentId: parentId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }
      mutate('/api/expenses/categories');
      alert("Category created successfully!");
      setCategoryName(""); // Clear input after successful submission
      setParentId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Your existing handleClose function is correct
  const handleClose = () => {
    setCategoryName("");
    setParentId(null);
    setError(null);
    onClose();
  };
  
  // --- NEW DELETE FUNCTION ---
  const handleDelete = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete its sub-categories if it is a parent.')) return;

    try {
        const res = await fetch(`/api/expenses/categories/${categoryId}`, { method: 'DELETE' });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to delete category');
        }
        alert('Category deleted successfully!');
        mutate('/api/expenses/categories'); // Re-fetch the list
    } catch(err: any) {
        alert(`Error: ${err.message}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>

        {/* --- NEW: List of Existing Categories --- */}
        <div className="mt-4 max-h-60 overflow-y-auto pr-2 space-y-2">
            {isLoading && <div className="text-center text-muted-foreground">Loading categories...</div>}
            {!isLoading && categories?.length === 0 && <p className="text-center text-sm text-muted-foreground">No categories created yet.</p>}
            {categories?.map(parent => (
                <div key={parent.id}>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="font-semibold text-sm">{parent.name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(parent.id)}>
                            <Trash2 className="h-4 w-4 text-red-500"/>
                        </Button>
                    </div>
                    {parent.children.map(child => (
                        <div key={child.id} className="flex items-center justify-between pl-6 pr-2 py-1">
                            <span className="text-sm">{child.name}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(child.id)}>
                                <Trash2 className="h-4 w-4 text-red-500"/>
                            </Button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
        
        {/* Form to Add New Category */}
        <form onSubmit={handleSubmit} className="pt-4 border-t mt-4">
          <p className="font-semibold mb-4 text-center">Add a New Category</p>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-cat-name" className="text-right">Name</Label>
              <Input id="new-cat-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-cat-parent" className="text-right">Parent</Label>
                <Select onValueChange={(value) => setParentId(value)} value={parentId || ''}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                    <SelectContent>
                        {categories?.map((cat) => (<SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>
            {error && <p className="col-span-4 text-red-500 text-sm text-center mt-2">{error}</p>}
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
   );
    }