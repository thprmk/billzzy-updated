// src/app/(dashboard)/reports/page.tsx

"use client";
import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";


// --- Type Definitions (Unchanged) ---
type ProductItem = { totalPrice: number; quantity: number; product: { name: string; }; };
type Customer = { name: string; phone: string | null; } | null;
type TransactionRecord = { 
  id?: number | string; date: string; companyBillNo: string; billingMode: string; 
  paymentStatus: string; totalPrice: number; shippingCost?: number; taxAmount?: number;    
  salesSource?: string; customer: Customer; items: ProductItem[]; 
};

// --- NEW: Modern Segmented Control Component ---
const SegmentedControl = ({ options, value, onChange }: { options: { label: string, value: string }[], value: string, onChange: (value: string) => void }) => (
  <div className="flex items-center space-x-1 bg-gray-200 p-1 rounded-lg">
    {options.map(option => (
      <button
        key={option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          "px-3 py-1 text-sm font-medium rounded-md transition-colors",
          value === option.value ? "bg-white text-gray-800 shadow-sm" : "bg-transparent text-gray-600 hover:bg-gray-100/50"
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const DailyReport: React.FC = () => {
  // --- State ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7), // Default to last 7 days
    to: new Date(),
  });
  const [modeFilter, setModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [data, setData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Data for our new components ---
  const modeOptions = [{ label: "All", value: "ALL" }, { label: "Online", value: "ONLINE" }, { label: "Offline", value: "OFFLINE" }];
  const statusOptions = [{ label: "All", value: "ALL" }, { label: "Paid", value: "PAID" }, { label: "Pending", value: "PENDING" }, { label: "Failed", value: "FAILED" }];
  const sourceOptions = [
    { value: 'ALL', label: 'All Sources' }, { value: 'Instagram', label: 'Instagram' }, { value: 'Facebook', label: 'Facebook' },
    { value: 'YouTube', label: 'YouTube' }, { value: 'Website', label: 'Website' }, { value: 'Referral', label: 'Referral' }, { value: 'Other', label: 'Other' },
  ];

  // --- API Call Functions ---
  const getApiParams = () => {
    if (!dateRange?.from || !dateRange?.to) return null;
    return {
      start: format(dateRange.from, "yyyy-MM-dd"),
      end: format(dateRange.to, "yyyy-MM-dd"),
      filters: { mode: modeFilter, status: statusFilter, source: sourceFilter }
    };
  };

  const fetchData = async () => {
    const params = getApiParams();
    if (!params) return toast.error("Please select a valid date range.");
    try {
      setLoading(true); setError(null); setData([]);
      const res = await axios.post("/api/reports", params);
      setData(res.data.data);
    } catch (err) {
      console.error(err); setError("Failed to fetch report.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const params = getApiParams();
    if (!params) return toast.error("Please select a valid date range.");
    try {
      setLoading(true);
      const res = await axios.get("/api/reports", {
        params: { start: params.start, end: params.end, format: 'xlsx', mode: modeFilter, status: statusFilter, source: sourceFilter },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales-report-${params.start}-to-${params.end}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err); toast.error(`Excel download failed`);
    } finally {
      setLoading(false);
    }
  };
  
  const totalPriceSum = data.reduce((sum, row) => sum + row.totalPrice, 0);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <h1 className="text-2xl md:text-2xl font-semibold text-gray-800">Sales Report</h1>
        
        {/* --- NEW, PROFESSIONAL FILTER BAR --- */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex flex-col md:flex-row items-center gap-4 flex-wrap">
            {/* Group 1: Mode */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Mode</label>
              <SegmentedControl options={modeOptions} value={modeFilter} onChange={setModeFilter} />
            </div>
            {/* Group 2: Status */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Status</label>
              <SegmentedControl options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
            </div>
            {/* Group 3: Source */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sourceOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Group 4: Date Range */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn( "w-[280px] justify-start text-left font-normal bg-white", !dateRange && "text-muted-foreground" )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>
                      ) : ( format(dateRange.from, "LLL dd, y") )
                    ) : ( <span>Pick a date</span> )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end pt-2">
              <Button onClick={fetchData} disabled={loading} className="w-full md:w-auto">
                  {loading ? 'Fetching...' : 'Fetch Report'}
              </Button>
          </div>
        </div>

        {/* --- (The results table section is unchanged) --- */}
        {loading && <div className="text-center p-8 text-gray-500">Loading report data...</div>}
        {error && <div className="text-center p-8 text-red-600 bg-red-50 rounded-md">{error}</div>}
        {!loading && data.length > 0 && (
          <div>
            <div className="flex justify-end space-x-3 mb-4">
              <Button variant="secondary" onClick={handleDownload} disabled={loading}>Download Excel</Button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th><th className="px-4 py-3">Bill No</th><th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Status</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Sales Channel</th><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Item Price</th><th className="px-4 py-3 text-right">Line Total</th>
                    <th className="px-4 py-3 text-right">Shipping</th><th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right">Bill Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) =>
                    (row.items.length > 0 ? row.items : [{ product: { name: 'N/A' }, quantity: 1, totalPrice: row.totalPrice } as any]).map((item, itemIndex) => (
                      <tr key={`${row.id}-${itemIndex}`} className="bg-white border-b hover:bg-gray-50">
                        {itemIndex === 0 ? (<>
                            <td className="px-4 py-3 font-medium" rowSpan={row.items.length || 1}>{new Date(row.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.companyBillNo}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}><span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${row.billingMode.toUpperCase() === 'ONLINE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{row.billingMode}</span></td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}><span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${row.paymentStatus.toUpperCase() === 'PAID' ? 'bg-emerald-100 text-emerald-800' : row.paymentStatus.toUpperCase() === 'PENDING' ? 'bg-amber-100 text-amber-800' : row.paymentStatus.toUpperCase() === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{row.paymentStatus}</span></td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.customer?.name ?? 'N/A'}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.customer?.phone ?? 'N/A'}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.salesSource || 'N/A'}</td>
                        </>) : null}
                       <td className="px-4 py-3">
                                {
                                  // Check for variant name first
                                  item.productVariant?.product?.name ? 
                                    `${item.productVariant.product.name} (${item.productVariant.size || item.productVariant.color || 'Variant'})`
                                  // Then check for standard product name
                                  : item.product?.name || 'N/A'
                                }
                              </td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">₹{((item.totalPrice ?? 0) / (item.quantity || 1)).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{(item.totalPrice ?? 0).toFixed(2)}</td>
                        {itemIndex === 0 ? (<>
                            <td className="px-4 py-3 text-right" rowSpan={row.items.length || 1}>₹{(row.shippingCost ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right" rowSpan={row.items.length || 1}>₹{(row.taxAmount ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900" rowSpan={row.items.length || 1}>₹{row.totalPrice.toFixed(2)}</td>
                        </>) : null}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold text-gray-900">
                  <tr><td className="px-4 py-3 text-right" colSpan={13}>Grand Total</td><td className="px-4 py-3 text-right">₹{totalPriceSum.toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        {!loading && !error && data.length === 0 && ( <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500"><p>No transactions found for the selected criteria.</p><p className="text-sm">Please select your filters and date range, then click "Fetch Report".</p></div>)}
      </div>
    </div>
  );
};

export default DailyReport;