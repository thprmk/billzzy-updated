
// src/components/expenses/ExpenseList.tsx
"use client";

import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Expense } from "@/app/(dashboard)/expenses/page";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ExpenseList({ onEdit }: ExpenseListProps) {
  const { data: expenses, error } = useSWR<Expense[]>("/api/expenses", fetcher);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses
      .filter((expense) => {
        const categoryName = expense.category?.name || "";
        const vendorName = expense.vendor?.name || "";
        const notes = expense.notes || "";

        const matchesSearch =
          categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          notes.toLowerCase().includes(searchTerm.toLowerCase());

        const expenseDate = new Date(expense.date);
        const matchesDate =
          (!fromDate || expenseDate >= new Date(fromDate)) &&
          (!toDate || expenseDate <= new Date(toDate));

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [expenses, searchTerm, fromDate, toDate]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    mutate("/api/expenses");
  };

  const handleDownloadExcel = () => {
    if (!filteredExpenses.length) return;

    const worksheet = XLSX.utils.json_to_sheet(
      filteredExpenses.map((exp) => ({
        Date: format(new Date(exp.date), "dd MMM yyyy"),
        Category: exp.category?.name || "",
        Vendor: exp.vendor?.name || "",
        Amount: exp.amount,
        Notes: exp.notes || "",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `billzzy_expenses_${new Date().toISOString()}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const tableHtml = `
      <html>
        <head>
          <title></title>
          <style>
            @media print {
              @page {
                margin: 0;
                size: A4;
              }
              body {
                margin: 0.5in;
              }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 20px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 4px solid #000000;
            }
            h1 { 
              color: #5A4FCF; 
              font-size: 28px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .report-date {
              color: #666;
              font-size: 14px;
              margin-top: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px 8px; 
              text-align: left; 
              font-size: 14px;
            }
            th { 
              background:  #5A4FCF;
              color: #000000; 
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 1px;
              border: 2px solid #000000;
            }
            td {
              color: #000000;
              font-weight: 500;
            }
            tr:nth-child(even) { 
              background-color: #f8f9fa; 
            }
            tr:hover { 
              background-color: #e8f4fd; 
            }
            td:nth-child(4) {
              font-weight: bold;
              color: #5A4FCF;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Billzzy Expenses Report</h1>
            <div class="report-date">Generated on ${format(new Date(), "dd MMM yyyy 'at' hh:mm a")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses
                .map(
                  (exp) => `
                  <tr>
                    <td>${format(new Date(exp.date), "dd MMM yyyy")}</td>
                    <td>${exp.category?.name || "-"}</td>
                    <td>${exp.vendor?.name || "-"}</td>
                    <td>${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(exp.amount)}</td>
                    <td>${exp.notes || "-"}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(tableHtml);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClearFilters = () => {
    setFromDate("");
    setToDate("");
    setSearchTerm("");
  };

  if (error)
    return <div className="text-red-500 text-center p-4">Failed to load expenses</div>;
  if (!expenses)
    return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      {/* Filters Section */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex gap-4 items-center">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-[#5A4FCF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5A4FCF]"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-[#5A4FCF] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5A4FCF]"
          />
          <input
            type="text"
            placeholder="Search by category, vendor, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-[#5A4FCF] rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-[#5A4FCF]"
          />
          {(fromDate || toDate || searchTerm) && (
            <Button
              onClick={handleClearFilters}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Print & Excel Buttons */}
        <div className="flex gap-2 justify-end">
          <Button
            onClick={handlePrint}
            className="bg-[#5A4FCF] text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9V2h12v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 14h12v8H6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Print
          </Button>
          <Button
            onClick={handleDownloadExcel}
            className="bg-[#5A4FCF] text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            Download Excel
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <table className="min-w-full border-collapse border border-gray-200 rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-[#5A4FCF] text-white">
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Category</th>
            <th className="p-2 border">Vendor</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Description</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-gray-500">
                No expenses found
              </td>
            </tr>
          ) : (
            filteredExpenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="p-2 border">
                  {format(new Date(expense.date), "dd MMM yyyy")}
                </td>
                <td className="p-2 border">{expense.category?.name || "-"}</td>
                <td className="p-2 border">{expense.vendor?.name || "-"}</td>
                <td className="p-2 border font-semibold">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(expense.amount)}
                </td>
                <td className="p-2 border">{expense.notes || "-"}</td>
                <td className="p-2 border flex gap-2">
                  <button
                    onClick={() => onEdit(expense)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}