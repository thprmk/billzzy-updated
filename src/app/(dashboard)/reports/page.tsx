"use client";
import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";

// --- UPDATED: Added shippingCost and taxAmount to the type definition ---
type ProductItem = { totalPrice: number; quantity: number; product: { name: string; }; };
type Customer = { name: string; phone: string | null; } | null;
type TransactionRecord = { 
  id?: number | string; 
  date: string; 
  customerId: number | string | null; 
  companyBillNo: string; 
  billingMode: string; 
  paymentMethod: string; 
  paymentStatus: string; 
  totalPrice: number; 
  amountPaid: number; 
  shippingCost?: number; // Added
  taxAmount?: number;    // Added
  customer: Customer; 
  items: ProductItem[]; 
};

// --- FilterButton Component (No changes) ---
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
  // --- State and Handlers (No changes) ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [data, setData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); };

  const fetchData = async () => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      setLoading(true);
      setError(null);
      setData([]);
      const res = await axios.post("/api/reports", { start: startDate, end: endDate, filters: { mode: modeFilter, status: statusFilter } });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      setLoading(true);
      const res = await axios.get("/api/reports", {
        params: { start: startDate, end: endDate, format: 'xlsx', mode: modeFilter, status: statusFilter },
        responseType: "blob",
      });
      const contentDisposition = res.headers['content-disposition'];
      let filename = `report.xlsx`;
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
      alert(`Excel download failed`);
    } finally {
      setLoading(false);
    }
  };
  
  const totalPriceSum = data.reduce((sum, row) => sum + row.totalPrice, 0);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Sales Report</h1>
        
        {/* --- Filter Bar UI (No changes) --- */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 mb-6 bg-gray-50 rounded-lg border">
            {/* ... filter buttons and date inputs ... */}
            <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-3 flex-wrap">
                <div className="flex items-center space-x-2">
                    <FilterButton label="All" value="ALL" activeValue={modeFilter} onClick={setModeFilter} />
                    <FilterButton label="Online" value="ONLINE" activeValue={modeFilter} onClick={setModeFilter} />
                    <FilterButton label="Offline" value="OFFLINE" activeValue={modeFilter} onClick={setModeFilter} />
                </div>
                <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                    <FilterButton label="All" value="ALL" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Paid" value="PAID" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Pending" value="PENDING" activeValue={statusFilter} onClick={setStatusFilter} />
                    <FilterButton label="Failed" value="FAILED" activeValue={statusFilter} onClick={setStatusFilter} />
                </div>
                <div className="hidden sm:block h-6 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                     <input id="startDate" type="date" className="border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={startDate} onChange={handleStartDateChange} />
                     <span className="text-gray-500">to</span>
                     <input id="endDate" type="date" min={startDate} className="border-gray-300 rounded-md shadow-sm p-1.5 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={endDate} onChange={handleEndDateChange} />
                </div>
            </div>
            <div className="w-full lg:w-auto">
                <Button className="w-full" onClick={fetchData} disabled={loading}>
                    {loading ? 'Fetching...' : 'Fetch Report'}
                </Button>
            </div>
        </div>

        {loading && <div className="text-center p-8 text-gray-500">Loading report data...</div>}
        {error && <div className="text-center p-8 text-red-600 bg-red-50 rounded-md">{error}</div>}

        {!loading && data.length > 0 && (
          <div>
            <div className="flex justify-end space-x-3 mb-4">
              <Button variant="secondary" onClick={handleDownload} disabled={loading}>Download Excel</Button>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left text-gray-700">
                {/* --- UPDATED: Table header now includes Shipping and Tax --- */}
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Bill No</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Item Price</th>
                    <th className="px-4 py-3 text-right">Line Total</th>
                    <th className="px-4 py-3 text-right">Shipping</th>
                    <th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right">Bill Total</th>
                  </tr>
                </thead>
                {/* --- UPDATED: Table body now renders all the new data --- */}
                <tbody>
                  {data.map((row) =>
                    (row.items.length > 0 ? row.items : [{ product: { name: 'N/A' }, quantity: 1, totalPrice: row.totalPrice } as any]).map((item, itemIndex) => (
                      <tr key={`${row.id}-${itemIndex}`} className="bg-white border-b hover:bg-gray-50">
                        {itemIndex === 0 ? (
                          <>
                            <td className="px-4 py-3 font-medium" rowSpan={row.items.length || 1}>{row.date.split("T")[0]}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.companyBillNo}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${row.billingMode.toUpperCase() === 'ONLINE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{row.billingMode}</span>
                            </td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>
                               <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                 row.paymentStatus.toUpperCase() === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                 row.paymentStatus.toUpperCase() === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                 row.paymentStatus.toUpperCase() === 'FAILED' ? 'bg-red-100 text-red-800' :
                                 'bg-gray-100 text-gray-800'
                               }`}>{row.paymentStatus}</span>
                            </td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.customer?.name ?? 'N/A'}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length || 1}>{row.customer?.phone ?? 'N/A'}</td>
                          </>
                        ) : null}
                        
                        <td className="px-4 py-3">{item.product.name}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">
                            ₹{((item.totalPrice ?? 0) / (item.quantity || 1)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                            ₹{(item.totalPrice ?? 0).toFixed(2)}
                        </td>
                        
                        {/* Only show Shipping, Tax, and Bill Total on the first item row */}
                        {itemIndex === 0 ? (
                          <>
                            <td className="px-4 py-3 text-right" rowSpan={row.items.length || 1}>
                              ₹{(row.shippingCost ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right" rowSpan={row.items.length || 1}>
                              ₹{(row.taxAmount ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900" rowSpan={row.items.length || 1}>
                              ₹{row.totalPrice.toFixed(2)}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
                {/* --- UPDATED: Footer colSpan adjusted for new columns --- */}
                <tfoot className="bg-gray-100 font-semibold text-gray-900">
                  <tr>
                    <td className="px-4 py-3 text-right" colSpan={12}>Grand Total</td>
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