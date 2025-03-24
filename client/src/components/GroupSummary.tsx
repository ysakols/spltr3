import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useExpenseFunctions } from '@/lib/hooks';
import { CircleDollarSign } from 'lucide-react';

import type { Group, Balance, User } from '@shared/schema';

interface GroupSummaryProps {
  group: Group;
  summary: Balance;
  members?: User[];
}

function GroupSummary({ group, summary, members = [] }: GroupSummaryProps) {
  const { formatCurrency } = useExpenseFunctions();
  
  // Get all member IDs from the paid/owes objects in the summary
  const memberIds = Object.keys(summary.paid || {});
  
  // Create a mapping of user IDs to usernames for easier lookup
  const userMap: Record<string, string> = {};
  members.forEach(member => {
    userMap[member.id.toString()] = member.username;
  });
  
  // Get username from ID
  const getUserName = (userId: string) => {
    return userMap[userId] || `User ${userId}`;
  };

  return (
    <div className="space-y-3">
      {/* Total Group Expenses */}
      <Card className="shadow-sm border-muted/60">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Total Group Expenses</h3>
            <span className="text-base font-bold text-primary">{formatCurrency(summary.totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Summaries */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Expense Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {memberIds.map(personId => (
            <Card key={personId} className="overflow-hidden shadow-sm border-muted/60">
              <CardHeader className="py-2 px-3 bg-primary/5 border-b">
                <CardTitle className="text-xs">{getUserName(personId)}</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total paid:</span>
                  <span className="font-medium">{formatCurrency(summary.paid[personId] || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total share:</span>
                  <span className="font-medium">{formatCurrency(summary.owes[personId] || 0)}</span>
                </div>
                <Separator className="my-1" />
                <div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Balance:</span>
                    <span className={`font-semibold ${(summary.balances[personId] || 0) > 0 ? 'text-green-600' : (summary.balances[personId] || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {formatCurrency(summary.balances[personId] || 0)}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 text-right mt-0.5">
                    {(summary.balances[personId] || 0) > 0 ? '(gets back)' : (summary.balances[personId] || 0) < 0 ? '(owes)' : '(settled)'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Settlement Plan */}
      <Card className="shadow-sm border-muted/60">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Settlement Plan</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {summary.settlements && summary.settlements.length > 0 ? (
            <ul className="space-y-2">
              {summary.settlements.map((settlement, index) => (
                <li key={index} className="flex items-center">
                  <div className="flex-shrink-0">
                    <CircleDollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-2 flex-1">
                    <div className="text-xs font-medium text-gray-900">
                      <span className="font-semibold">{getUserName(settlement.from)}</span> pays <span className="font-semibold">{getUserName(settlement.to)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Amount: <span className="font-semibold text-primary">{formatCurrency(settlement.amount)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-2 text-xs text-gray-500">All expenses are already settled!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GroupSummary;
