"use client";
import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";

// Type definitions are correct 
type ProductItem = { quantity: number; product: { name: string; }; };
type Customer = { name: string; phone: string | null; } | null;
type TransactionRecord = { id?: number | string; date: string; customerId: number | string | null; companyBillNo: string; billingMode: string; paymentMethod: string; paymentStatus: string; totalPrice: number; amountPaid: number; customer: Customer; items: ProductItem[]; };

// A reusable component for the filter buttons for a better UI/UX 
const FilterButton = ({ label, value, activeValue, onClick }: { label: string, value: string, activeValue: string, onClick: (value: string) => void }) => {
  const isActive = value === activeValue;
  const baseClasses = "px-3 py-1.5 text-sm font-medium border rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500";
  const activeClasses = "bg-indigo-600 text-white border-indigo-600 shadow-sm";
  const inactiveClasses = "bg-white text-gray-600 hover:bg-gray-100 border-gray-300";

  return (
    <button onClick={() => onClick(value)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
    </button>
  );
};

const DailyReport: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // --- Separate states for each filter group 
  const [modeFilter, setModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  const [data, setData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Logic functions are correct and do not need changes ---
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); };

  const fetchData = async () => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      setLoading(true);
      setError(null);
      setData([]);
      const res = await axios.post("/api/reports", {
        start: startDate,
        end: endDate,
        filters: {
          mode: modeFilter,
          status: statusFilter,
        }
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch report. Please try again.");
      alert("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      setLoading(true);
      const res = await axios.get("/api/reports", {
        params: {
          start: startDate,
          end: endDate,
          format: format,
          mode: modeFilter,
          status: statusFilter,
        },
        responseType: "blob",
      });
      const contentDisposition = res.headers['content-disposition'];
      let filename = `report-${modeFilter.toLowerCase()}-${statusFilter.toLowerCase()}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
      }
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(`${format.toUpperCase()} download failed`);
    } finally {
      setLoading(false);
    }
  };
  
  const totalPriceSum = data.reduce((sum, row) => sum + row.totalPrice, 0);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Sales Report</h1>
        
        {/* --- UI/UX ENHANCEMENT: The new "Filter Bar" --- */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 mb-6 bg-gray-50 rounded-lg border">
            {/* Left side: All filter controls */}
            <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-3 flex-wrap">
                {/* Mode Filter Group */}
                <div className="flex items-center space-x-2">
                    <FilterButton label="All" value="ALL" activeValue={modeFilter} onClick={setModeFilter} />
                    <FilterButton label="Online" value="ONLINE" activeValue={modeFilter} onClick={setModeFilter} />
                    <FilterButton label="Offline" value="OFFLINE" activeValue={modeFilter} onClick={setModeFilter} />
                </div>

                {/* Visual Separator */}
                <div className="hidden sm:block h-6 w-px bg-gray-300"></div>

                {/* Status Filter Group */}
                <div className="flex items-center space-x-2">
                    <FilterButton label="All" value="ALL" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Paid" value="PAID" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Pending" value="PENDING" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Failed" value="FAILED" activeValue={statusFilter} onClick={setStatusFilter} />
                </div>
                
                 {/* Visual Separator */}
                <div className="hidden sm:block h-6 w-px bg-gray-300"></div>

                {/* Date Range Group */}
                <div className="flex items-center gap-2">
                     <input id="startDate" type="date" className="border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={startDate} onChange={handleStartDateChange} />
                     <span className="text-gray-500">to</span>
                     <input id="endDate" type="date" min={startDate} className="border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={endDate} onChange={handleEndDateChange} />
                </div>
            </div>

            {/* Right side: The final action button */}
            <div className="w-full lg:w-auto">
                <Button className="w-full" onClick={fetchData} disabled={loading}>
                    {loading ? 'Fetching...' : 'Fetch Report'}
                </Button>
            </div>
        </div>

        {/* --- The rest of the UI remains unchanged and will work perfectly --- */}
        {loading && <div className="text-center p-8 text-gray-500">Loading report data...</div>}
        {error && <div className="text-center p-8 text-red-600 bg-red-50 rounded-md">{error}</div>}

        {!loading && data.length > 0 && (
          <div>
            <div className="flex justify-end space-x-3 mb-4">
              <Button variant="secondary" onClick={() => handleDownload('xlsx')} disabled={loading}>Download Excel</Button>
              <Button variant="secondary" onClick={() => handleDownload('pdf')} disabled={loading}>Download PDF</Button>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Bill No</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className ="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Transaction Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.length > 0 ? data : []).map((row) =>
                    (row.items.length > 0 ? row.items : [{ product: {name: 'N/A'}, quantity: 1 } as ProductItem]).map((item, itemIndex) => (
                      <tr key={`${row.id}-${itemIndex}`} className="bg-white border-b hover:bg-gray-50">
                        {itemIndex === 0 ? (
                          <>
                            <td className="px-4 py-3 font-medium" rowSpan={row.items.length || 1}>{row.date.split("T")[0]}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.companyBillNo}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>
                              {row.billingMode.toUpperCase() === 'ONLINE' ? (
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">ONLINE</span>
                              ) : (
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">OFFLINE</span>
                              )}
                            </td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>
                              {row.paymentStatus.toUpperCase() === 'PAID' ? (
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">PAID</span>
                              ) : row.paymentStatus.toUpperCase() === 'PENDING' ? (
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">PENDING</span>
                              ) : row.paymentStatus.toUpperCase() === 'FAILED' ? (
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">FAILED</span>
                              ) : (
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{row.paymentStatus}</span>
                              )}
                            </td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.customer?.name ?? 'N/A'}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.customer?.phone ?? 'N/A'}</td>
                          </>
                        ) : null}
                        <td className="px-4 py-3">{item.product.name}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        {itemIndex === 0 ? (
                          <td className="px-4 py-3 text-right" rowSpan={row.items.length || 1}>₹{row.totalPrice.toFixed(2)}</td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold text-gray-900">
                  <tr>
                    <td className="px-4 py-3 text-right" colSpan={8}>Grand Total</td>
                    <td className="px-4 py-3 text-right">₹{totalPriceSum.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        {!loading && !error && data.length === 0 && (
           <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
             <p>No transactions found for the selected criteria.</p>
             <p className="text-sm">Please select your filters and date range, then click "Fetch Report".</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default DailyReport;