// src/components/expenses/ExpenseStats.tsx
"use client";

import useSWR from 'swr';
import { Card } from "@/components/ui/Card"; // Corrected import (uppercase C)
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
                <Skeleton className="h-[108px]" />
                <Skeleton className="h-[108px]" />
                <Skeleton className="h-[108px]" />
            </div>
        );
    }

    if (error || !data) {
        return <p className="text-red-500">Could not load stats.</p>;
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Total Spend */}
            <Card className="p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium">Spend (This Month)</p>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                    <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.totalSpendThisMonth)}
                    </div>
                </div>
            </Card>

            {/* Card 2: Total Transactions */}
            <Card className="p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium">Total Expenses (This Month)</p>
                    <List className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                    <div className="text-2xl font-bold">+{data.totalTransactionsThisMonth}</div>
                </div>
            </Card>
            
            {/* Card 3: Top Category */}
            <Card className="p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium">Top Category (This Month)</p>
                    <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                    <div className="text-2xl font-bold">
                        {data.topCategory ? data.topCategory.name : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {data.topCategory ? 
                            `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.topCategory.total)} spent`
                            : 'No spending yet this month'
                        }
                    </p>
                </div>
            </Card>
        </div>
    )
}