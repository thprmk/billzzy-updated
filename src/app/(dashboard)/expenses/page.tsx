// src/app/(dashboard)/expenses/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlusCircle } from "lucide-react";
import ExpenseList from "@/components/expenses/ExpenseList";
import ExpenseForm from "@/components/expenses/ExpenseForm";

// Define the Expense type here to be shared between components.
// This is the full structure, matching our API's GET response.
export interface Expense {
  id: number;
  date: string;
  amount: number;
  notes: string | null;
  paymentMode: string;
  categoryId: number; // Add this
  vendorId: number | null; // Add this
  category: { id: number; name: string; };
  vendor: { id: number; name: string; } | null;
}

export default function ExpensesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  // State to hold the expense currently being edited
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleOpenAddModal = () => {
    setEditingExpense(null); // Ensure we are in "add" mode
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense); // Set the expense to edit
    setIsFormOpen(true); // Open the same form
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingExpense(null); // Clear editing state when closing
  };
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handleOpenAddModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>
      
      {/* Pass the edit handler down to the list */}
      <ExpenseList onEdit={handleOpenEditModal} />

      {/* The form is now smarter, controlled by both states */}
      <ExpenseForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm}
        initialData={editingExpense} // Pass the expense data for editing
      />
    </div>
  );
}