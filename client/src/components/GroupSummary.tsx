import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    userMap[member.id.toString()] = 
      member.display_name || 
      ((member.first_name && member.last_name) 
        ? `${member.first_name} ${member.last_name}` 
        : member.email || 'User');
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

  // This line ensures currentUserId is treated as a number in the component
  const safeCurrentUserId = currentUserId || 0;

  return (
    <div className="space-y-4">
      <Card className="shadow-md border-0 overflow-hidden">
        <CardContent className="p-0">
          {/* Group Total Header */}
          <div className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-1 h-6 bg-primary"></div>
                <h3 className="text-sm font-bold">Total Group Expenses</h3>
              </div>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1">
                {formatCurrency(summary.totalExpenses)}
              </span>
            </div>
          </div>
          
          {/* Member Balances Table */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-bold mb-3 flex items-center">
              <div className="w-1 h-4 bg-primary mr-2"></div>
              Member Balances
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-2 pl-3 font-medium text-sm text-gray-500 w-[35%]">Member</th>
                    <th className="pb-2 font-medium text-sm text-gray-500 text-right w-[20%]">Paid</th>
                    <th className="pb-2 font-medium text-sm text-gray-500 text-right w-[20%]">Owes</th>
                    <th className="pb-2 pr-3 font-medium text-sm text-gray-500 text-right w-[25%]">Balance</th>
                  </tr>
                </thead>
                <tbody>
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
                      <tr 
                        key={personId} 
                        className={`border-b border-gray-100 last:border-0 ${isCurrentUser ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-3 pl-3">
                          <div className="flex items-center">
                            {isCurrentUser && <div className="w-1 h-4 bg-primary mr-2 flex-shrink-0"></div>}
                            <span className="font-medium text-sm">{getUserName(personId)}</span>
                            {isCurrentUser && <span className="ml-2 text-xs text-primary/80 bg-primary/10 px-2 py-0.5 flex-shrink-0">You</span>}
                          </div>
                        </td>
                        <td className="py-3 text-right font-medium text-sm">{formatCurrency(isPaid)}</td>
                        <td className="py-3 text-right font-medium text-sm">{formatCurrency(isOwed)}</td>
                        <td className="py-3 pr-3 text-right">
                          <span className={`text-sm font-bold px-3 py-1 ${balanceColor}`}>
                            {formatCurrency(balance)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Settlement Plan Section */}
          {summary.settlements && summary.settlements.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center">
                <div className="w-1 h-4 bg-primary mr-2"></div>
                Settlement Plan
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full mb-2">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="pb-2 pl-3 font-medium text-sm text-gray-500 w-[37.5%]">From</th>
                      <th className="pb-2 font-medium text-sm text-gray-500 w-[37.5%]">To</th>
                      <th className="pb-2 pr-3 font-medium text-sm text-gray-500 text-right w-[25%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.settlements.map((settlement, index) => {
                      const isUserInvolved = currentUserId && (Number(settlement.from) === currentUserId || Number(settlement.to) === currentUserId);
                      const isUserPaying = currentUserId && Number(settlement.from) === currentUserId;
                      
                      return (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-100 last:border-0 ${isUserInvolved ? 'bg-primary/5' : ''}`}
                        >
                          <td className="py-3 pl-3">
                            <div className="flex items-center">
                              <CircleDollarSign className={`h-4 w-4 mr-2 flex-shrink-0 ${isUserPaying ? 'text-red-500' : 'text-primary'}`} />
                              <span className={`font-medium text-sm ${Number(settlement.from) === currentUserId ? 'text-primary' : ''}`}>
                                {getUserName(settlement.from)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`font-medium text-sm ${Number(settlement.to) === currentUserId ? 'text-primary' : ''}`}>
                              {getUserName(settlement.to)}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-right">
                            <span className="font-bold text-sm text-primary px-3 py-1 bg-primary/10">
                              {formatCurrency(settlement.amount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Settlement buttons for current user */}
              {summary.settlements.some(s => currentUserId && Number(s.from) === currentUserId) && (
                <div className="mt-4 border-t pt-3 border-gray-100">
                  <h4 className="text-sm font-medium mb-2">Your pending payments:</h4>
                  <div className="space-y-2">
                    {summary.settlements
                      .filter(s => currentUserId && Number(s.from) === currentUserId)
                      .map((settlement, index) => (
                        <div key={index} className="flex items-center justify-between gap-2 bg-gray-50 p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Pay {getUserName(settlement.to)}</span>
                            <span className="font-medium text-sm">{formatCurrency(settlement.amount)}</span>
                          </div>
                          <SettlementButton 
                            settlement={settlement}
                            currentUserId={safeCurrentUserId}
                            userMap={userMap}
                            groupId={group.id}
                            variant="outline"
                            size="sm"
                            className="border-primary/50 hover:bg-primary/5 text-sm h-8"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* No settlements case */}
          {(!summary.settlements || summary.settlements.length === 0) && (
            <div className="p-5 text-center">
              <p className="text-sm text-gray-700">
                No settlements needed in this group.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Everyone is either balanced or close to it.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GroupSummary;
