// src/components/dashboard/DateFilter.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";

// This interface matches the props your DashboardStats component is already sending.
interface DateFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onFilterApply: () => void;
  onReset: () => void;
  onAllTime: () => void;
  isLoading: boolean;
  session: any;
}

export default function DateFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onFilterApply,
  onReset,
  onAllTime,
  isLoading,
  session,
}: DateFilterProps) {

  // This internal state manages the visual selection in the calendar popup.
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      return { from: parseISO(startDate), to: parseISO(endDate) };
    }
    return undefined;
  });

  // This ensures the calendar UI updates if the parent state changes (e.g., after clicking Reset or All Time).
  useEffect(() => {
    if (startDate && endDate) {
      setDate({ from: parseISO(startDate), to: parseISO(endDate) });
    } else {
      setDate(undefined);
    }
  }, [startDate, endDate]);

  // This function is called when the user selects a date in the calendar.
  // It updates the parent component's state via the on...Change props.
  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate);
    onStartDateChange(selectedDate?.from ? format(selectedDate.from, 'yyyy-MM-dd') : '');
    onEndDateChange(selectedDate?.to ? format(selectedDate.to, 'yyyy-MM-dd') : '');
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{session?.user?.shopName || 'Dashboard'}</h1>
        <p className="text-gray-500">Welcome back, {session?.user?.name || 'User'}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-[280px] justify-start text-left font-normal bg-white", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, yyyy")} -{" "}
                    {format(date.to, "LLL dd, yyyy")}
                  </>
                ) : (
                  format(date.from, "LLL dd, yyyy")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <Button onClick={onFilterApply} disabled={isLoading || !startDate || !endDate}>
          {isLoading ? 'Applying...' : 'Apply Filter'}
        </Button>
        <Button onClick={onAllTime} variant="secondary">All Time</Button>
        <Button onClick={onReset} variant="ghost">Reset</Button>
      </div>
    </div>
  );
}