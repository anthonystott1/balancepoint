import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, User } from 'lucide-react';

export default function OwnerEquityCard({ owner, onTakeDraw, onMakeContribution, canEdit }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const netChange = owner.ytd_contributions - owner.ytd_draws;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{owner.owner_name}</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                {owner.ownership_percentage}% ownership
              </p>
            </div>
          </div>
          {owner.is_active ? (
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Equity Balance */}
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-xs text-indigo-700 mb-1">Current Equity Balance</p>
          <p className="text-2xl font-bold text-indigo-900">
            {formatCurrency(owner.current_equity_balance)}
          </p>
        </div>

        {/* YTD Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">YTD Contributions</p>
            <p className="text-lg font-semibold text-green-700">
              {formatCurrency(owner.ytd_contributions)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">YTD Draws</p>
            <p className="text-lg font-semibold text-red-700">
              {formatCurrency(owner.ytd_draws)}
            </p>
          </div>
        </div>

        {/* Net Change */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Net Change (YTD)</span>
            <span className={`text-lg font-semibold ${netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && owner.is_active && (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => onMakeContribution(owner)}
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Put Money In
            </Button>
            <Button
              variant="outline"
              className="border-indigo-600 text-indigo-700 hover:bg-indigo-50"
              onClick={() => onTakeDraw(owner)}
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Take Money Out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
