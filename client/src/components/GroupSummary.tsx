import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useExpenseFunctions } from '@/lib/hooks';
import { CircleDollarSign } from 'lucide-react';
import { SettlementButton } from '@/components/SettlementButton';
import { SettlementHistory } from '@/components/SettlementHistory';

import type { Group, Balance, User } from '@shared/schema';

interface GroupSummaryProps {
  group: Group;
  summary: Balance;
  members?: User[];
}

function GroupSummary({ group, summary, members = [] }: GroupSummaryProps) {
  const { formatCurrency } = useExpenseFunctions();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
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
  
  // Get current user ID on component mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.id);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  return (
    <div className="space-y-2">
      {/* Total Group Expenses */}
      <Card className="shadow-sm border-muted/60">
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-900">Total Group Expenses</h3>
            <span className="text-sm font-bold text-primary">{formatCurrency(summary.totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Summaries - Now in a more compact layout */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-900">Member Balances</h3>
        
        {memberIds.map(personId => (
          <Card key={personId} className="overflow-hidden shadow-sm border-muted/60">
            <CardHeader className="py-1 px-2 bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs">{getUserName(personId)}</CardTitle>
                <span className={`text-xs font-semibold ${(summary.balances[personId] || 0) > 0 ? 'text-green-600' : (summary.balances[personId] || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(summary.balances[personId] || 0)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1 text-xs">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <div className="flex justify-between sm:flex-col">
                  <span className="text-gray-500 text-[10px]">Paid:</span>
                  <span className="font-medium text-[10px]">{formatCurrency(summary.paid[personId] || 0)}</span>
                </div>
                <div className="flex justify-between sm:flex-col sm:items-end">
                  <span className="text-gray-500 text-[10px]">Owes:</span>
                  <span className="font-medium text-[10px]">{formatCurrency(summary.owes[personId] || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Settlement Plan - More Compact */}
      {summary.settlements && summary.settlements.length > 0 && (
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="py-1 px-2">
            <CardTitle className="text-xs">Settlement Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ul className="space-y-2">
              {summary.settlements.map((settlement, index) => (
                <li key={index} className="text-[10px] flex items-center">
                  <div className="flex items-center space-x-1 flex-grow">
                    <CircleDollarSign className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="font-medium">{getUserName(settlement.from)}</span>
                    <span className="text-muted-foreground">pays</span>
                    <span className="font-medium">{getUserName(settlement.to)}</span>
                    <span className="font-semibold text-primary ml-auto">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                  
                  {currentUserId && (
                    <div className="ml-2">
                      <SettlementButton
                        settlement={settlement}
                        currentUserId={currentUserId}
                        userMap={userMap}
                        groupId={group.id}
                        size="sm"
                        variant="outline"
                        buttonText="Settle"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Settlement History */}
      {currentUserId && (
        <div className="mt-8">
          <SettlementHistory userId={currentUserId} groupId={group.id} />
        </div>
      )}
    </div>
  );
}

export default GroupSummary;
