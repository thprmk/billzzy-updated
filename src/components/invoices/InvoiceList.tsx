// src/components/invoices/InvoiceList.tsx
"use client"

import React from "react"
import useSWR from "swr"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

// Define the type for an invoice object we expect from the API
interface Invoice {
  id: number
  invoiceNumber: string
  status: string
  totalAmount: number
  dueDate: string
  notes: string
}

// The fetcher function for useSWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })

const customerFromNotes = (notes: string) => (notes ? notes.split("\n")[0] : "—")

const statusClasses = (status: string) => {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
  if (status === "PAID") return `${base} bg-emerald-100 text-emerald-800`
  return `${base} bg-amber-100 text-amber-800`
}

export function InvoiceList() {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "PAID" | "DRAFT">("DRAFT")

  const { data, error, isLoading, mutate } = useSWR<Invoice[]>("/api/invoices", fetcher)

  const invoices = data ?? []

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((inv) => {
      const matchesQuery =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        customerFromNotes(inv.notes).toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "ALL" ? true : inv.status.toUpperCase() === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [invoices, query, statusFilter])

  if (isLoading) {
    return <div className="rounded-lg border bg-white p-6 text-sm text-gray-700 shadow-sm">Loading invoices…</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h2 className="mb-2 text-balance text-lg font-semibold text-gray-900">Failed to load invoices</h2>
        <p className="mx-auto mb-4 max-w-sm text-sm text-gray-600">
          Something went wrong while fetching data. Please try again.
        </p>
        <div className="flex items-center justify-center">
          <button
            onClick={() => mutate()}
            aria-label="Retry loading invoices"
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // If no data at all from backend
  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <h2 className="mb-2 text-balance text-lg font-semibold text-gray-900">No invoices yet</h2>
        <p className="mx-auto max-w-sm text-sm text-gray-600">No invoices found.</p>
      </div>
    )
  }

  // If we have data but filters return nothing
  const noMatches = filtered.length === 0

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-balance text-xl font-semibold text-gray-900">All Invoices</h2>
        <Link
          href="/invoice/new"
          aria-label="Create a new invoice"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Create New Invoice
        </Link>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center gap-2 md:max-w-md">
          <div className="relative w-full">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by invoice, customer, or status"
              className="w-full rounded-md border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-0 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              aria-label="Search invoices"
            />
          </div>

          <Select 
  value={statusFilter}
  onValueChange={(value) => setStatusFilter(value as "ALL" | "PAID" | "DRAFT")}
>
  <SelectTrigger className="w-auto" aria-label="Filter by status">
    <SelectValue placeholder="Filter by status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All Statuses</SelectItem>
    <SelectItem value="PAID">Paid</SelectItem>
    <SelectItem value="DRAFT">Draft</SelectItem>
  </SelectContent>
</Select>
        </div>
      </div>

      {/* No matches state */}
      {noMatches ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="mb-3 text-sm text-gray-600">No invoices match your filters.</p>
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => {
                setQuery("")
                setStatusFilter("ALL")
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="mt-2 grid gap-3 md:hidden">
        {filtered.map((invoice) => {
          const customer = customerFromNotes(invoice.notes)
          return (
            <Link
              key={invoice.id}
              href={`/invoice/${invoice.id}`}
              className="group rounded-md border p-4 transition-colors hover:bg-gray-50"
              aria-label={`Open invoice ${invoice.invoiceNumber}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                    <span className={statusClasses(invoice.status)}>{invoice.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{customer}</p>
                  <p className="mt-1 text-xs text-gray-500">Due {formatDate(invoice.dueDate)}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(invoice.totalAmount)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <tbody>
              {filtered.map((invoice) => {
                const customer = customerFromNotes(invoice.notes)
                return (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      <Link href={`/invoice/${invoice.id}`} className="text-indigo-600 hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-700">{customer}</td>
                    <td className="p-3 text-gray-700">{formatDate(invoice.dueDate)}</td>
                    <td className="p-3">
                      <span className={statusClasses(invoice.status)}>{invoice.status}</span>
                    </td>
                    <td className="p-3 text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
