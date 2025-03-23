import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useExpenseFunctions } from '@/lib/hooks';
import { CircleDollarSign } from 'lucide-react';

import type { Group, Balance } from '@shared/schema';

interface GroupSummaryProps {
  group: Group;
  summary: Balance;
}

function GroupSummary({ group, summary }: GroupSummaryProps) {
  const { formatCurrency } = useExpenseFunctions();

  return (
    <div className="space-y-6">
      {/* Total Group Expenses */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Total Group Expenses</h3>
            <span className="text-2xl font-bold text-primary">{formatCurrency(summary.totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Summaries */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {group.people.map(person => (
            <Card key={person} className="overflow-hidden">
              <CardHeader className="py-4 px-5 bg-primary/5 border-b">
                <CardTitle className="text-base">{person}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total paid:</span>
                  <span className="font-medium">{formatCurrency(summary.paid[person] || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total share:</span>
                  <span className="font-medium">{formatCurrency(summary.owes[person] || 0)}</span>
                </div>
                <Separator />
                <div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Balance:</span>
                    <span className={`font-semibold ${(summary.balances[person] || 0) > 0 ? 'text-green-600' : (summary.balances[person] || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatCurrency(summary.balances[person] || 0)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-right mt-1">
                    {(summary.balances[person] || 0) > 0 ? '(gets back)' : (summary.balances[person] || 0) < 0 ? '(owes)' : '(settled)'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Settlement Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.settlements.length > 0 ? (
            <ul className="space-y-4">
              {summary.settlements.map((settlement, index) => (
                <li key={index} className="flex items-center">
                  <div className="flex-shrink-0">
                    <CircleDollarSign className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      <span className="font-semibold">{settlement.from}</span> pays <span className="font-semibold">{settlement.to}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Amount: <span className="font-semibold text-primary">{formatCurrency(settlement.amount)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">All expenses are already settled!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GroupSummary;
