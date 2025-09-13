// src/app/api/expenses/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(expense);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();
  const data: any = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  if (body.category !== undefined) data.category = String(body.category);
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.notes !== undefined) data.notes = body.notes;
  const updated = await prisma.expense.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
