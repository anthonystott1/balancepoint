import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';

export default function BalanceSheetReport({ data, isLoading }) {
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

  const { totalAssets, totalLiabilities, totalEquity, netWorth, assetDetails, liabilityDetails, equityDetails } = data;
  const isPositiveNetWorth = netWorth > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className={`border-0 shadow-lg ${isPositiveNetWorth ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : 'bg-gradient-to-br from-orange-50 to-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Worth</p>
              <p className={`text-3xl font-bold ${isPositiveNetWorth ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(Math.abs(netWorth))}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {isPositiveNetWorth 
                  ? 'Your business has positive equity' 
                  : 'Your liabilities exceed your assets'
                }
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isPositiveNetWorth ? 'bg-blue-100' : 'bg-red-100'}`}>
              <PiggyBank className={`w-8 h-8 ${isPositiveNetWorth ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">What You Own</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalAssets)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">What You Owe</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalLiabilities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Your Equity</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalEquity)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle>Balance Sheet</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Snapshot of your financial position</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column: Assets */}
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-green-200">
                  <h3 className="text-lg font-semibold text-green-900">Assets (What You Own)</h3>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(totalAssets)}</span>
                </div>
                
                {assetDetails.length > 0 ? (
                  <div className="space-y-2">
                    {assetDetails.map(item => (
                      <div key={item.account.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.account.name}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No assets recorded</p>
                )}
              </div>
            </div>

            {/* Right Column: Liabilities + Equity */}
            <div>
              {/* Liabilities */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-red-200">
                  <h3 className="text-lg font-semibold text-red-900">Liabilities (What You Owe)</h3>
                  <span className="text-lg font-bold text-red-700">{formatCurrency(totalLiabilities)}</span>
                </div>
                
                {liabilityDetails.length > 0 ? (
                  <div className="space-y-2">
                    {liabilityDetails.map(item => (
                      <div key={item.account.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.account.name}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No liabilities recorded</p>
                )}
              </div>

              {/* Equity */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900">Equity (Your Ownership)</h3>
                  <span className="text-lg font-bold text-blue-700">{formatCurrency(totalEquity)}</span>
                </div>
                
                {equityDetails.length > 0 ? (
                  <div className="space-y-2">
                    {equityDetails.map(item => (
                      <div key={item.account.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.account.name}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No equity recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Total Liabilities + Equity</h3>
                <p className="text-xs text-gray-600 mt-1">Should equal total assets</p>
              </div>
              <span className="text-2xl font-bold text-blue-700">
                {formatCurrency(totalLiabilities + totalEquity)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
