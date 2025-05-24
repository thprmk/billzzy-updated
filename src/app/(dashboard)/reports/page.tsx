"use client";
import React, { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/Button";

type TransactionRecord = {
  id: number;
  date: string;
  customerId: number;
  billNo: string;
  paymentMethod: string;
  paymentStatus: string;
  totalPrice: number;
  amountPaid: number;
};

const DailyReport: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (endDate && endDate < newStart) {
      setEndDate(""); // Clear end date if it becomes invalid
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const fetchData = async () => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      setLoading(true);
      const res = await axios.post("/api/reports", {
        start: startDate,
        end: endDate,
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      const res = await axios.get("/api/reports", {
        params: { start: startDate, end: endDate, format: "pdf" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("PDF download failed");
    }
  };

  const handleDownloadExcel = async () => {
    if (!startDate || !endDate) return alert("Select both dates");
    try {
      const res = await axios.get("/api/reports", {
        params: { start: startDate, end: endDate, format: "xlsx" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Excel download failed");
    }
  };

  const filteredData = data.filter(
    (row) => row.paymentStatus.toLowerCase() === "paid"
  );

  const totalPriceSum = filteredData.reduce(
    (sum, row) => sum + row.totalPrice,
    0
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl md:text-2xl font-semibold mb-6 ">Report Details</h1>

      {/* Filter + Button Section */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap md:items-center gap-3 md:gap-4">
        <input
          type="date"
          className="border p-2 rounded w-full sm:w-[180px] md:w-[200px]"
          value={startDate}
          onChange={handleStartDateChange}
        />
        <input
          type="date"
          min={startDate}
          className="border p-2 rounded w-full sm:w-[180px] md:w-[200px]"
          value={endDate}
          onChange={handleEndDateChange}
        />
        <Button className="w-full sm:w-auto" onClick={fetchData}>
          Fetch Report
        </Button>
        <Button className="w-full sm:w-auto" onClick={handleDownload}>
          Download PDF
        </Button>
        <Button className="w-full sm:w-auto" onClick={handleDownloadExcel}>
          Download Excel
        </Button>
      </div>

      {loading && <p className="text-gray-600">Loading...</p>}

      {filteredData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full mt-4 border text-sm text-left min-w-[650px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Customer ID</th>
                <th className="p-2 border">Bill No</th>
                <th className="p-2 border">Payment Method</th>
                <th className="p-2 border">Payment Status</th>
                <th className="p-2 border">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id}>
                  <td className="p-2 border">{row.date.split("T")[0]}</td>
                  <td className="p-2 border">{row.customerId}</td>
                  <td className="p-2 border">{row.billNo}</td>
                  <td className="p-2 border">{row.paymentMethod}</td>
                  <td className="p-2 border">{row.paymentStatus}</td>
                  <td className="p-2 border">₹{row.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="p-2 border" colSpan={5}>
                  Total
                </td>
                <td className="p-2 border">₹{totalPriceSum.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!loading && data.length > 0 && filteredData.length === 0 && (
        <p className="text-red-500">
          No paid transactions found in this range.
        </p>
      )}
    </div>
  );
};

export default DailyReport;