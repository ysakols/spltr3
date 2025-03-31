import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useExpenseFunctions } from '@/lib/hooks';
import { CircleDollarSign } from 'lucide-react';
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
    <div className="space-y-4">
      {/* Total Group Expenses */}
      <Card className="shadow-md border-0 overflow-hidden">
        <CardContent className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-1 h-6 bg-primary"></div>
              <h3 className="text-sm font-bold">Total Group Expenses</h3>
            </div>
            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1">
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Summaries */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold flex items-center">
          <div className="w-1 h-5 bg-primary mr-2"></div>
          Member Balances
        </h3>
        
        {memberIds.map(personId => {
          const isCurrentUser = currentUserId === Number(personId);
          const balance = summary.balances[personId] || 0;
          const isPaid = summary.paid[personId] || 0;
          const isOwed = summary.owes[personId] || 0;
          const balanceColor = 
            balance > 0 ? 'text-green-600 bg-green-50' : 
            balance < 0 ? 'text-red-600 bg-red-50' : 
            'text-gray-600 bg-gray-100';
            
          return (
            <Card 
              key={personId} 
              className={`overflow-hidden shadow-md border-0 transition-shadow hover:shadow-lg ${isCurrentUser ? 'ring-1 ring-primary/30' : ''}`}
            >
              <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-transparent border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center min-w-0 max-w-[65%]">
                    {isCurrentUser && <div className="w-1 h-4 bg-primary mr-2 flex-shrink-0"></div>}
                    <span className="truncate">{getUserName(personId)}</span>
                    {isCurrentUser && <span className="ml-2 text-xs text-primary/80 bg-primary/10 px-2 py-0.5 flex-shrink-0">You</span>}
                  </CardTitle>
                  <span className={`text-sm font-bold px-3 py-1 ${balanceColor} whitespace-nowrap ml-1`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 text-sm">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="text-gray-500 mb-1">Paid</span>
                    <span className="font-medium">{formatCurrency(isPaid)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-gray-500 mb-1">Owes</span>
                    <span className="font-medium">{formatCurrency(isOwed)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Settlement Plan */}
      {summary.settlements && summary.settlements.length > 0 && (
        <Card className="shadow-md border-0 overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle className="text-sm font-bold flex items-center">
              <div className="w-1 h-4 bg-primary mr-2"></div>
              Settlement Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-4">
              {summary.settlements.map((settlement, index) => {
                const isUserInvolved = currentUserId && (Number(settlement.from) === currentUserId || Number(settlement.to) === currentUserId);
                const isUserPaying = currentUserId && Number(settlement.from) === currentUserId;
                
                return (
                  <li 
                    key={index} 
                    className={`text-sm flex flex-col gap-y-3 p-3 ${isUserInvolved ? 'bg-primary/5' : ''} border-b border-gray-100 last:border-b-0 last:pb-0`}
                  >
                    <div className="flex items-center gap-x-2 w-full">
                      <CircleDollarSign className={`h-4 w-4 flex-shrink-0 ${isUserPaying ? 'text-red-500' : 'text-primary'}`} />
                      <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0">
                        <span className={`font-medium truncate ${Number(settlement.from) === currentUserId ? 'text-primary' : ''}`}>
                          {getUserName(settlement.from)}
                        </span>
                        <span className="text-gray-500 mx-1">→</span>
                        <span className={`font-medium truncate ${Number(settlement.to) === currentUserId ? 'text-primary' : ''}`}>
                          {getUserName(settlement.to)}
                        </span>
                      </div>
                      <span className="font-bold text-primary ml-auto px-3 py-1 bg-primary/10 whitespace-nowrap">
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>
                    
                    {/* Settlement button */}
                    {isUserPaying && (
                      <div className="mt-1">
                        <SettlementButton 
                          settlement={settlement}
                          currentUserId={currentUserId}
                          userMap={userMap}
                          groupId={group.id}
                          variant="outline"
                          size="sm"
                          className="w-full bg-white border-primary/50 hover:bg-primary/5 text-sm h-8"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* No settlements case */}
      {(!summary.settlements || summary.settlements.length === 0) && (
        <Card className="shadow-md border-0">
          <CardContent className="p-5 text-center">
            <p className="text-sm text-gray-700">
              No settlements needed in this group.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Everyone is either balanced or close to it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GroupSummary;
