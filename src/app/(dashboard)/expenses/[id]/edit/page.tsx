"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const id = params.id;
  const [form, setForm] = useState({ title: "", amount: "", category: "", date: "", notes: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/expenses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          title: data.title || "",
          amount: String(data.amount || ""),
          category: data.category || "",
          date: data.date ? new Date(data.date).toISOString().slice(0,10) : "",
          notes: data.notes || "",
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      toast.success("Expense updated");
      router.push("/expenses");
    } else {
      toast.error("Update failed");
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-xl mx-auto mt-6">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-semibold mb-4 text-primary">Edit Expense</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2">
              <Button type="submit" className="bg-primary">Save</Button>
              <Button type="button" onClick={() => router.push("/expenses")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
