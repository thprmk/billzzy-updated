// src/app/api/expenses/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = {
    title: String(body.title || ""),
    amount: parseFloat(body.amount) || 0,
    category: String(body.category || "Misc"),
    date: body.date ? new Date(body.date) : new Date(),
    notes: body.notes ?? null,
  };
  const created = await prisma.expense.create({ data });
  return NextResponse.json(created, { status: 201 });
}
