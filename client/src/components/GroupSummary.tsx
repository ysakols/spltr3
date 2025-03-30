import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useExpenseFunctions } from '@/lib/hooks';
import { CircleDollarSign } from 'lucide-react';
import { SettlementHistory } from '@/components/SettlementHistory';
import { SettlementButton } from '@/components/SettlementButton';

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
    userMap[member.id.toString()] = member.firstName && member.lastName 
      ? `${member.firstName} ${member.lastName}` 
      : member.displayName || 'User';
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
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-900">Total Group Expenses</h3>
            <span className="text-sm font-bold text-primary">{formatCurrency(summary.totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Summaries - Now in a more compact layout */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-medium text-gray-900">Member Balances</h3>
        
        {memberIds.map(personId => (
          <Card key={personId} className="overflow-hidden shadow-sm border-muted/60">
            <CardHeader className="py-1.5 px-3 bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs">{getUserName(personId)}</CardTitle>
                <span className={`text-xs font-semibold ${(summary.balances[personId] || 0) > 0 ? 'text-green-600' : (summary.balances[personId] || 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(summary.balances[personId] || 0)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 text-xs">
              <div className="flex justify-between">
                <div>
                  <span className="text-gray-500">Paid:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.paid[personId] || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Owes:</span>
                  <span className="font-medium ml-2">{formatCurrency(summary.owes[personId] || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Settlement Plan - More Compact */}
      {summary.settlements && summary.settlements.length > 0 && (
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="py-1.5 px-3 bg-primary/5 border-b">
            <CardTitle className="text-xs">Settlement Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ul className="space-y-3">
              {summary.settlements.map((settlement, index) => (
                <li key={index} className="text-xs flex flex-col gap-y-2 pb-2 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-x-1.5 w-full">
                    <CircleDollarSign className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium">{getUserName(settlement.from)}</span>
                    <span className="text-muted-foreground">pays</span>
                    <span className="font-medium">{getUserName(settlement.to)}</span>
                    <span className="font-semibold text-primary ml-auto">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                  
                  {/* Settlement button */}
                  {currentUserId && Number(settlement.from) === currentUserId && (
                    <div className="mt-1.5">
                      <SettlementButton 
                        settlement={settlement}
                        currentUserId={currentUserId}
                        userMap={userMap}
                        groupId={group.id}
                        variant="outline"
                        size="sm"
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
