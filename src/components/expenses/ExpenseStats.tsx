
// src/components/expenses/ExpenseStats.tsx
"use client";

import useSWR from 'swr';
import { Card } from "@/components/ui/Card";
import { DollarSign, List, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ExpenseSummary {
    totalSpendThisMonth: number;
    totalTransactionsThisMonth: number;
    topCategory: {
        name: string;
        total: number;
    } | null;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ExpenseStats() {
    const { data, error, isLoading } = useSWR<ExpenseSummary>('/api/analytics/expenses/summary', fetcher);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[120px] rounded-2xl" />
                <Skeleton className="h-[120px] rounded-2xl" />
                <Skeleton className="h-[120px] rounded-2xl" />
            </div>
        );
    }

    if (error || !data) {
        return <p className="text-red-500 text-center font-semibold">Could not load billzzy stats.</p>;
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Total Spend */}
            <Card className="p-6 rounded-2xl shadow-lg bg-[#5A4FCF] text-white hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer">
                <div className="flex items-center justify-between pb-2">
                    <p className="text-sm font-medium opacity-90">Billzzy Spend (This Month)</p>
                    <div className="p-2 rounded-full bg-white/20">
                        <DollarSign className="h-5 w-5 text-white" />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.totalSpendThisMonth)}
                    </div>
                    <p className="text-xs opacity-80 mt-1">Tracking all your monthly billzzy spend</p>
                </div>
            </Card>

            {/* Card 2: Total Transactions */}
            <Card className="p-6 rounded-2xl shadow-lg bg-[#5A4FCF] text-white hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer">
                <div className="flex items-center justify-between pb-2">
                    <p className="text-sm font-medium opacity-90">Total Billzzy Expenses</p>
                    <div className="p-2 rounded-full bg-white/20">
                        <List className="h-5 w-5 text-white" />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-bold">+{data.totalTransactionsThisMonth}</div>
                    <p className="text-xs opacity-80 mt-1">Number of transactions logged</p>
                </div>
            </Card>
            
            {/* Card 3: Top Category */}
            <Card className="p-6 rounded-2xl shadow-lg bg-[#5A4FCF] text-white hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer">
                <div className="flex items-center justify-between pb-2">
                    <p className="text-sm font-medium opacity-90">Billzzy Top Category</p>
                    <div className="p-2 rounded-full bg-white/20">
                        <Tag className="h-5 w-5 text-white" />
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-bold">
                        {data.topCategory ? data.topCategory.name : 'N/A'}
                    </div>
                    <p className="text-xs opacity-80 mt-1">
                        {data.topCategory 
                            ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.topCategory.total)} spent`
                            : 'No spending yet this month'
                        }
                    </p>
                </div>
            </Card>
        </div>
    );
}
