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
    <div className="space-y-2">
      {/* Total Group Expenses */}
      <div className="border border-border/50 bg-muted/10 shadow-sm p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-primary"></div>
            <h3 className="text-xs font-medium">Total Group Expenses</h3>
          </div>
          <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5">
            {formatCurrency(summary.totalExpenses)}
          </span>
        </div>
      </div>
      
      {/* Individual Summaries */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium flex items-center">
          <div className="w-0.5 h-3 bg-primary mr-1"></div>
          Member Balances
        </h3>
        
        <div className="space-y-1.5">
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
              <div 
                key={personId} 
                className={`border border-border/50 bg-card shadow-sm overflow-hidden ${isCurrentUser ? 'ring-1 ring-primary/20' : ''}`}
              >
                <div className="border-b border-border/30 bg-muted/10 p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 max-w-[65%]">
                      {isCurrentUser && <div className="w-0.5 h-3 bg-primary mr-1 flex-shrink-0"></div>}
                      <span className="truncate text-xs font-medium">{getUserName(personId)}</span>
                      {isCurrentUser && <span className="ml-1 text-[10px] text-primary/80 bg-primary/10 px-1 py-0.5 flex-shrink-0">You</span>}
                    </div>
                    <span className={`text-xs font-medium px-1.5 py-0.5 ${balanceColor} whitespace-nowrap ml-1`}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </div>
                <div className="p-2 text-xs">
                  <div className="flex justify-between">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs mb-0.5">Paid</span>
                      <span className="font-medium">{formatCurrency(isPaid)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-muted-foreground text-xs mb-0.5">Owes</span>
                      <span className="font-medium">{formatCurrency(isOwed)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Settlement Plan */}
      {summary.settlements && summary.settlements.length > 0 && (
        <div className="border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border/30 bg-muted/10 p-2">
            <h3 className="text-xs font-medium flex items-center">
              <div className="w-0.5 h-3 bg-primary mr-1"></div>
              Settlement Plan
            </h3>
          </div>
          <div className="p-2">
            <ul className="space-y-2 divide-y divide-border/30">
              {summary.settlements.map((settlement, index) => {
                const isUserInvolved = currentUserId && (Number(settlement.from) === currentUserId || Number(settlement.to) === currentUserId);
                const isUserPaying = currentUserId && Number(settlement.from) === currentUserId;
                
                return (
                  <li 
                    key={index} 
                    className={`text-xs flex flex-col gap-y-1.5 py-1.5 ${isUserInvolved ? 'bg-primary/5' : ''} first:pt-0`}
                  >
                    <div className="flex items-center gap-x-1 w-full">
                      <CircleDollarSign className={`h-3 w-3 flex-shrink-0 ${isUserPaying ? 'text-red-500' : 'text-primary'}`} />
                      <div className="flex items-center flex-1 min-w-0">
                        <span className={`font-medium truncate text-xs ${Number(settlement.from) === currentUserId ? 'text-primary' : ''}`}>
                          {getUserName(settlement.from)}
                        </span>
                        <span className="text-muted-foreground mx-1 text-xs">→</span>
                        <span className={`font-medium truncate text-xs ${Number(settlement.to) === currentUserId ? 'text-primary' : ''}`}>
                          {getUserName(settlement.to)}
                        </span>
                      </div>
                      <span className="font-medium text-primary ml-auto px-1.5 py-0.5 bg-primary/10 text-xs whitespace-nowrap">
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
                          className="w-full border-primary/30 hover:bg-primary/5 text-xs h-6"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      
      {/* No settlements case */}
      {(!summary.settlements || summary.settlements.length === 0) && (
        <div className="border border-border/50 bg-card shadow-sm p-2">
          <p className="text-xs text-muted-foreground text-center">
            No settlements needed in this group.
          </p>
        </div>
      )}
    </div>
  );
}

export default GroupSummary;
