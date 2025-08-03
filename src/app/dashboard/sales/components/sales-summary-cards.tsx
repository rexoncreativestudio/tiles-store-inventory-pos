import React from 'react';

interface SalesSummaryCardsProps {
  totalSales: number;
  totalSaleIncome: number;
  netProfit: number;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) + "XAF";
}

export default function SalesSummaryCards({
  totalSales,
  totalSaleIncome,
  netProfit,
}: SalesSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
        <div className="text-gray-500 font-medium mb-2 flex items-center gap-2">
          Total Sales <span className="text-xs text-gray-400 ml-1">(count)</span>
        </div>
        <div className="text-3xl font-bold mb-1">{totalSales}</div>
        <div className="text-xs text-gray-400">Number of sales records</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
        <div className="text-gray-500 font-medium mb-2">Total Sale Income</div>
        <div className="text-3xl font-bold mb-1">{formatCurrency(totalSaleIncome)}</div>
        <div className="text-xs text-gray-400">Gross income from all sales</div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
        <div className="text-gray-500 font-medium mb-2">Net Profit</div>
        <div className="text-3xl font-bold mb-1">{formatCurrency(netProfit)}</div>
        <div className="text-xs text-gray-400">Income - Costs from all sales</div>
      </div>
    </div>
  );
}