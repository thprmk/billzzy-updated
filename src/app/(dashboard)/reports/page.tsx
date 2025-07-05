"use client";
import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";

// --- Type definitions are correct ---
type ProductItem = { quantity: number; product: { name: string; }; };
type Customer = { name: string; phone: string | null; } | null;
type TransactionRecord = { id?: number | string; date: string; customerId: number | string | null; companyBillNo: string; billingMode: string; paymentMethod: string; paymentStatus: string; totalPrice: number; amountPaid: number; customer: Customer; items: ProductItem[]; };

const DailyReport: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Your data fetching and download logic is correct and remains unchanged.
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(""); };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); };
  const fetchData = async () => { if (!startDate || !endDate) return alert("Select both dates"); try { setLoading(true); setError(null); const res = await axios.post("/api/reports", { start: startDate, end: endDate }); setData(res.data.data); } catch (err) { console.error(err); setError("Failed to fetch report. Please try again."); alert("Failed to fetch report"); } finally { setLoading(false); } };
  const handleDownload = async (format: 'pdf' | 'xlsx') => { if (!startDate || !endDate) return alert("Select both dates"); try { setLoading(true); const res = await axios.get("/api/reports", { params: { start: startDate, end: endDate, format: format }, responseType: "blob", }); const contentDisposition = res.headers['content-disposition']; let filename = `report.${format}`; if (contentDisposition) { const filenameMatch = contentDisposition.match(/filename="([^"]+)"/); if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1]; } const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement("a"); link.href = url; link.setAttribute("download", filename); document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url); } catch (err) { console.error(err); alert(`${format.toUpperCase()} download failed`); } finally { setLoading(false); } };
  
  const totalPriceSum = data.reduce((sum, row) => sum + row.totalPrice, 0);

  return (
    // --- UI ENHANCEMENT: Main container with consistent padding ---
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Sales Report</h1>
        
        {/* --- UI ENHANCEMENT: Cleaned up filter section --- */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 mb-6 bg-gray-50 rounded-lg border">
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
            <input id="startDate" type="date" className="w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" value={startDate} onChange={handleStartDateChange} />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
            <input id="endDate" type="date" min={startDate} className="w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500" value={endDate} onChange={handleEndDateChange} />
          </div>
          <div className="w-full sm:w-auto self-end">
            <Button className="w-full" onClick={fetchData} disabled={loading}>
              {loading ? 'Fetching...' : 'Fetch Report'}
            </Button>
          </div>
        </div>

        {/* --- UI ENHANCEMENT: Improved loading and empty/error states --- */}
        {loading && <div className="text-center p-8 text-gray-500">Loading report data...</div>}
        {error && <div className="text-center p-8 text-red-600 bg-red-50 rounded-md">{error}</div>}

        {!loading && data.length > 0 && (
          <div>
            <div className="flex justify-end space-x-3 mb-4">
               <Button variant="secondary" onClick={() => handleDownload('xlsx')} disabled={loading}>Download Excel</Button>
               <Button variant="secondary" onClick={() => handleDownload('pdf')} disabled={loading}>Download PDF</Button>
            </div>
            
            {/* --- UI ENHANCEMENT: Wrapper for the table for better styling --- */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Bill No</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Transaction Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) =>
                    row.items.map((item, itemIndex) => (
                      // --- UI ENHANCEMENT: Zebra striping for better readability ---
                      <tr key={`${row.id}-${itemIndex}`} className="bg-white border-b hover:bg-gray-50">
                        {itemIndex === 0 ? (
                          <>
                            <td className="px-4 py-3 font-medium" rowSpan={row.items.length}>{row.date.split("T")[0]}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length}>{row.companyBillNo}</td>
                            <td className="px-4 py-3" rowSpan={row.items.length}>
                              {row.billingMode.toUpperCase() === 'ONLINE' ? (
                              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              ONLINE
                              </span>
                              ) : (
                              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              OFFLINE
                              </span>
                              )}
                              </td>
                            <td className="px-4 py-3" rowSpan={row.items.length}>{row.customer?.name ?? 'N/A'}</td>
                          </>
                        ) : null}
                        <td className="px-4 py-3">{item.product.name}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        {itemIndex === 0 ? (
                          <td className="px-4 py-3 text-right" rowSpan={row.items.length}>₹{row.totalPrice.toFixed(2)}</td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
                {/* --- UI ENHANCEMENT: Clearer Grand Total footer --- */}
                <tfoot className="bg-gray-100 font-semibold text-gray-900">
                  <tr>
                    <td className="px-4 py-3 text-right" colSpan={6}>Grand Total</td>
                    <td className="px-4 py-3 text-right">₹{totalPriceSum.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        {!loading && !error && data.length === 0 && (
           <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
             <p>No transactions found for the selected date range.</p>
             <p className="text-sm">Please select a start and end date and click "Fetch Report".</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default DailyReport;