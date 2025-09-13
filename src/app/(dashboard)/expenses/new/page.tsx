"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";

export default function NewExpensePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", amount: "", category: "", date: "", notes: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date || new Date().toISOString(),
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      toast.success("Expense added");
      router.push("/expenses");
    } else {
      toast.error("Failed to add");
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-6">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4 text-primary">Add New Expense</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Button type="submit" className="w-full bg-primary">Save Expense</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
