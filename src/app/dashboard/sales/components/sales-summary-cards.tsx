import React from 'react';

interface SalesSummaryCardsProps {
  totalSales: number;
  totalSaleIncome: number;
  netProfit: number;
  mobileMode?: boolean;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) + " XAF";
}

export default function SalesSummaryCards({
  totalSales,
  totalSaleIncome,
  netProfit,
  mobileMode = false,
}: SalesSummaryCardsProps) {
  // Use flexbox for horizontal desktop layout and vertical for mobile
  return (
    <div
      className={
        mobileMode
          ? "flex flex-col gap-4 w-full"
          : "flex flex-row gap-6 w-full justify-start items-stretch"
      }
    >
      <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between min-w-[180px]">
        <div className="text-gray-500 font-medium mb-2 flex items-center gap-2">
          Total Sales <span className="text-xs text-gray-400 ml-1">(count)</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold mb-1 break-words">{totalSales}</div>
        <div className="text-xs text-gray-400">Number of sales records</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between min-w-[180px]">
        <div className="text-gray-500 font-medium mb-2">Total Sale Income</div>
        <div className="text-2xl sm:text-3xl font-bold mb-1 break-words">{formatCurrency(totalSaleIncome)}</div>
        <div className="text-xs text-gray-400">Gross income from all sales</div>
      </div>
      <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between min-w-[180px]">
        <div className="text-gray-500 font-medium mb-2">Net Profit</div>
        <div className="text-2xl sm:text-3xl font-bold mb-1 break-words">{formatCurrency(netProfit)}</div>
        <div className="text-xs text-gray-400">Income - Costs from all sales</div>
      </div>
    </div>
  );
}  