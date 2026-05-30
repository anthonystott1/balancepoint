import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function ProfitLossReport({ data, isLoading }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-500">Loading report...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { totalIncome, totalExpenses, netProfit, incomeDetails, expenseDetails } = data;
  const isProfitable = netProfit > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className={`border-0 shadow-lg ${isProfitable ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-orange-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Profit</p>
              <p className={`text-3xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(Math.abs(netProfit))}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {isProfitable 
                  ? `You made ${formatCurrency(netProfit)} in profit this period` 
                  : `You had a loss of ${formatCurrency(Math.abs(netProfit))} this period`
                }
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isProfitable ? 'bg-green-100' : 'bg-red-100'}`}>
              {isProfitable ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Report */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle>Profit & Loss Statement</CardTitle>
          <p className="text-sm text-gray-500 mt-1">What you earned and spent</p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Income Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-green-200">
              <h3 className="text-lg font-semibold text-green-900">What You Earned (Revenue)</h3>
              <span className="text-lg font-bold text-green-700">{formatCurrency(totalIncome)}</span>
            </div>
            
            {incomeDetails.length > 0 ? (
              <div className="space-y-2 ml-4">
                {incomeDetails.map(item => (
                  <div key={item.account.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.account.name}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 ml-4">No income recorded</p>
            )}
          </div>

          {/* Expenses Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-red-200">
              <h3 className="text-lg font-semibold text-red-900">What You Spent (Expenses)</h3>
              <span className="text-lg font-bold text-red-700">{formatCurrency(totalExpenses)}</span>
            </div>
            
            {expenseDetails.length > 0 ? (
              <div className="space-y-2 ml-4">
                {expenseDetails.map(item => (
                  <div key={item.account.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.account.name}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 ml-4">No expenses recorded</p>
            )}
          </div>

          {/* Net Profit */}
          <div className={`p-4 rounded-lg ${isProfitable ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Net Profit (Loss)</h3>
              <span className={`text-2xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                {isProfitable ? '+' : '-'}{formatCurrency(Math.abs(netProfit))}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Revenue minus expenses = {isProfitable ? 'profit' : 'loss'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
