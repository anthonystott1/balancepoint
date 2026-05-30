import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';

export default function CashFlowReport({ data, isLoading }) {
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

  const { cashIn, cashOut, netCashFlow } = data;
  const isPositive = netCashFlow > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className={`border-0 shadow-lg ${isPositive ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-orange-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Cash Flow</p>
              <p className={`text-3xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {isPositive ? '+' : ''}{formatCurrency(netCashFlow)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {isPositive 
                  ? `Your cash increased by ${formatCurrency(netCashFlow)}` 
                  : `Your cash decreased by ${formatCurrency(Math.abs(netCashFlow))}`
                }
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-8 h-8 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Report */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle>Cash Flow Statement</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Actual money movement in and out</p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Cash In */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <ArrowDownCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Money Coming In</h3>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(cashIn)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 ml-13">
              Deposits, payments received, and other cash receipts
            </p>
          </div>

          {/* Cash Out */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <ArrowUpCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Money Going Out</h3>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(cashOut)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 ml-13">
              Withdrawals, payments made, and other cash expenditures
            </p>
          </div>

          {/* Net Change */}
          <div className={`p-4 rounded-lg ${isPositive ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Net Change in Cash</h3>
              <span className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                {isPositive ? '+' : ''}{formatCurrency(netCashFlow)}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Money in minus money out = net cash {isPositive ? 'increase' : 'decrease'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
