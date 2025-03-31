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
    <div className="space-y-3">
      {/* Total Group Expenses */}
      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardContent className="p-3 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-6 bg-primary/70 !rounded-none"></div>
              <h3 className="text-xs font-medium">Total Group Expenses</h3>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 !rounded-none">
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Summaries */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium flex items-center">
          <div className="w-1 h-3 bg-primary/70 mr-1.5 !rounded-none"></div>
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
              className={`overflow-hidden shadow-sm !rounded-none border-border/50 transition-shadow hover:shadow-md ${isCurrentUser ? 'ring-1 ring-primary/20' : ''}`}
            >
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs flex items-center min-w-0 max-w-[65%]">
                    {isCurrentUser && <div className="w-1 h-3 bg-primary mr-1.5 !rounded-none flex-shrink-0"></div>}
                    <span className="truncate">{getUserName(personId)}</span>
                    {isCurrentUser && <span className="ml-1.5 text-[10px] text-primary/70 bg-primary/10 px-1.5 !rounded-none flex-shrink-0">You</span>}
                  </CardTitle>
                  <span className={`text-xs font-semibold px-2 py-0.5 !rounded-none ${balanceColor} whitespace-nowrap ml-1`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 text-xs">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground mb-0.5">Paid</span>
                    <span className="font-medium">{formatCurrency(isPaid)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-muted-foreground mb-0.5">Owes</span>
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
        <Card className="shadow-sm !rounded-none border-border/50 overflow-hidden">
          <CardHeader className="py-2 px-3 bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle className="text-xs flex items-center">
              <div className="w-1 h-3 bg-primary/70 mr-1.5 !rounded-none"></div>
              Settlement Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ul className="space-y-3">
              {summary.settlements.map((settlement, index) => {
                const isUserInvolved = currentUserId && (Number(settlement.from) === currentUserId || Number(settlement.to) === currentUserId);
                const isUserPaying = currentUserId && Number(settlement.from) === currentUserId;
                
                return (
                  <li 
                    key={index} 
                    className={`text-xs flex flex-col gap-y-2 p-2 !rounded-none ${isUserInvolved ? 'bg-primary/5' : ''} border-b border-border/30 last:border-b-0 last:pb-0`}
                  >
                    <div className="flex items-center gap-x-1.5 w-full">
                      <CircleDollarSign className={`h-3.5 w-3.5 flex-shrink-0 ${isUserPaying ? 'text-red-500' : 'text-primary'}`} />
                      <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0">
                        <span className={`font-medium truncate ${Number(settlement.from) === currentUserId ? 'text-primary' : ''}`}>
                          {getUserName(settlement.from)}
                        </span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className={`font-medium truncate ${Number(settlement.to) === currentUserId ? 'text-primary' : ''}`}>
                          {getUserName(settlement.to)}
                        </span>
                      </div>
                      <span className="font-semibold text-primary ml-auto px-1.5 py-0.5 bg-primary/10 !rounded-none whitespace-nowrap">
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
                          className="w-full bg-white border-primary/30 hover:bg-primary/5 text-xs h-7"
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
        <Card className="shadow-sm !rounded-none border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No settlements needed in this group.
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Everyone is either balanced or close to it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default GroupSummary;
