import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Balance, Settlement, Group, User } from "@shared/schema";
import { useLocation } from "wouter";
import { Card, CardContent } from '@/components/ui/card';
import { Users, Check, CheckCircle, Banknote } from 'lucide-react';
import GroupSummary from './GroupSummary';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { getQueryFn } from '@/lib/queryClient';
import { displayToNumericId } from '@/lib/id-utils';
import { useSettlementModal } from '@/hooks/use-settlement-modal';

// Separate component for group details to avoid conditional hooks
function GroupDetails({ groupId, group, summary, members }: { 
  groupId: number; 
  group: Group | undefined; 
  summary: Balance | undefined; 
  members: User[] | undefined;
}) {
  if (!group || !summary || !members) {
    return null;
  }

  return (
    <div className="flex-grow flex flex-col min-h-0 border-t mt-4">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <h2 className="font-medium text-base text-primary">
          {group.name}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Group Summary
        </p>
      </div>
      
      {/* Ensure this div takes remaining space and scrolls internally */}
      <div className="overflow-y-auto px-5 flex-grow">
        <GroupSummary 
          group={group} 
          summary={summary}
          members={members}
        />
      </div>
    </div>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="h-5 bg-muted animate-pulse rounded-md w-1/3"></div>
      </div>
      
      <div className="space-y-5">
        <div>
          <div className="h-4 bg-muted animate-pulse rounded-md w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="border rounded-lg p-4 bg-card/50 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted animate-pulse rounded-md w-1/3"></div>
                <div className="h-3 bg-muted animate-pulse rounded-md w-1/4"></div>
              </div>
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md"></div>
            </div>
            
            <div className="border rounded-lg p-4 bg-card/50 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted animate-pulse rounded-md w-1/3"></div>
                <div className="h-3 bg-muted animate-pulse rounded-md w-1/4"></div>
              </div>
              <div className="h-9 w-24 bg-muted animate-pulse rounded-md"></div>
            </div>
          </div>
        </div>
        
        <div className="pt-5 border-t mt-3">
          <div className="h-5 bg-muted animate-pulse rounded-md w-1/4 mb-3"></div>
          <div className="h-3 bg-muted animate-pulse rounded-md w-1/5 mb-5"></div>
          <div className="space-y-4">
            <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
            <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
            <div className="h-12 bg-muted animate-pulse rounded-md w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component
export function BalanceSidebar() {
  const settlementModal = useSettlementModal();
  const [location] = useLocation();
  
  // Parse group ID from location
  const groupIdMatch = location.match(/\/groups\/([a-zA-Z0-9]+)/);
  const currentGroupId = groupIdMatch ? displayToNumericId(groupIdMatch[1]) : null;
  
  // Query for current user
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60000,
    retry: false
  });
  
  // Derive user ID (fallback for demo purposes)
  const userId = currentUser?.id || 3;
  
  // Query for all groups
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups', userId],
    queryFn: async ({ queryKey }) => {
      const id = queryKey[1];
      const res = await fetch(`${queryKey[0] as string}?userId=${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error('Failed to fetch groups');
      }
      return res.json();
    },
  });
  
  // Query for all users
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Group-related queries (only enabled when on a group page)
  const { data: currentGroup } = useQuery<Group>({
    queryKey: [`/api/groups/${currentGroupId}`],
    enabled: !!currentGroupId,
  });
  
  const { data: currentMembers } = useQuery<User[]>({
    queryKey: [`/api/groups/${currentGroupId}/members`],
    enabled: !!currentGroupId,
  });
  
  const { data: currentSummary } = useQuery<Balance>({
    queryKey: [`/api/groups/${currentGroupId}/summary`],
    enabled: !!currentGroupId,
    refetchInterval: 5000,
    staleTime: 2000,
    gcTime: 30000,
  });
  
  // Global summary query for the current user
  const { data: summary, isLoading } = useQuery<Balance>({
    queryKey: [`/api/users/${userId}/global-summary`],
    enabled: !!userId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
    gcTime: 30000,
  });
  
  // Build a userMap for name lookups
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    
    // Add current group members first (if any)
    if (currentMembers) {
      currentMembers.forEach(member => {
        map[member.id.toString()] = 
          member.display_name || 
          ((member.first_name && member.last_name) 
            ? `${member.first_name} ${member.last_name}` 
            : member.email || 'User');
      });
    }
    
    // Then add all other users
    allUsers.forEach(user => {
      map[user.id.toString()] = 
        user.display_name || 
        ((user.first_name && user.last_name) 
          ? `${user.first_name} ${user.last_name}` 
          : user.email || 'User');
    });
    
    return map;
  }, [currentMembers, allUsers]);
  
  // Function to get username from ID
  const getUserName = (userId: string) => {
    return userMap[userId] || `User ${userId}`;
  };
  
  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }
  
  // No data state
  if (!summary) {
    return (
      <div className="h-full flex flex-col text-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-medium text-base text-primary">Balance Summary</h2>
        </div>
        <div className="p-5 flex-1 flex items-center justify-center">
          <div className="rounded-lg border border-border p-5 text-center bg-muted/10 shadow-sm max-w-xs mx-auto">
            <div className="mb-3 flex justify-center">
              <div className="bg-primary/5 p-2.5 rounded-full">
                <Users className="h-6 w-6 text-primary/60" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground/90 mb-2">Could not load summary data</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Log the summary data
  console.log("Summary data:", summary);
  
  // Filter active settlements
  const activeSettlements = summary.settlements.filter(settlement => {
    const fromBalance = summary.balances[settlement.from];
    const toBalance = summary.balances[settlement.to];
    return Math.abs(fromBalance) > 0.01 || Math.abs(toBalance) > 0.01;
  });
  
  const peopleWhoOweMe = activeSettlements.filter(
    s => s.to === userId.toString()
  );
  
  const peopleIOwe = activeSettlements.filter(
    s => s.from === userId.toString()
  );
  
  console.log("People who owe me:", peopleWhoOweMe);
  console.log("People I owe:", peopleIOwe);
  
  return (
    <div className="h-full flex flex-col text-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
        <h2 className="font-medium text-base text-primary">Balance Summary</h2>
      </div>
      
      {/* Global Balance Section */}
      <div className="flex-shrink-0 px-5 pt-5">
        {/* People who owe you */}
        {peopleWhoOweMe.length > 0 && (
          <div className="mb-7">
            <h3 className="text-sm font-medium mb-4 text-green-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 mr-2 rounded-full"></div>
              Money Owed To You
            </h3>
            <div className="space-y-3">
              {peopleWhoOweMe
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => {
                  const fromUserName = getUserName(settlement.from);
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-green-50/30 rounded-lg border border-green-100 shadow-sm">
                      <div>
                        <div className="font-medium text-sm">{fromUserName}</div>
                        <div className="text-green-600 font-medium text-sm mt-0.5">
                          +{formatCurrency(settlement.amount)}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        className="h-9 px-3 text-xs bg-green-50 hover:bg-green-100 text-green-700 group relative overflow-hidden"
                        onClick={() => {
                          settlementModal.openSettlementModal({
                            fromUserId: parseInt(settlement.from),
                            toUserId: parseInt(settlement.to),
                            amount: settlement.amount,
                            isCreditor: true
                          });
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5 group-hover:animate-bounce" />
                        <span className="whitespace-nowrap">Mark Received</span>
                        <span className="absolute inset-0 h-full w-full scale-0 rounded-md bg-green-100/60 transition-transform duration-300 group-hover:scale-100" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* People you owe */}
        {peopleIOwe.length > 0 && (
          <div className="mb-7">
            <h3 className="text-sm font-medium mb-4 text-red-600 flex items-center">
              <div className="w-2 h-2 bg-red-500 mr-2 rounded-full"></div>
              Money You Owe
            </h3>
            <div className="space-y-3">
              {peopleIOwe
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-red-50/30 rounded-lg border border-red-100 shadow-sm">
                    <div>
                      <div className="font-medium text-sm">{getUserName(settlement.to)}</div>
                      <div className="text-red-600 font-medium text-sm mt-0.5">
                        -{formatCurrency(settlement.amount)}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="h-9 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-700 group relative overflow-hidden"
                      onClick={() => {
                        settlementModal.openSettlementModal({
                          fromUserId: parseInt(settlement.from),
                          toUserId: parseInt(settlement.to),
                          amount: settlement.amount,
                          isCreditor: false
                        });
                      }}
                    >
                      <Banknote className="h-3.5 w-3.5 mr-1.5 group-hover:translate-y-[-2px] transition-transform duration-200" />
                      <span className="whitespace-nowrap">Pay</span>
                      <span className="absolute inset-0 h-full w-full scale-0 rounded-md bg-red-100/60 transition-transform duration-300 group-hover:scale-100" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* No settlements case */}
        {peopleWhoOweMe.length === 0 && peopleIOwe.length === 0 && (
          <div className="mb-7 p-5 border border-dashed rounded-lg text-center bg-muted/5 shadow-sm">
            <div className="mb-3 flex justify-center">
              <div className="bg-primary/5 p-2.5 rounded-full">
                <Users className="h-6 w-6 text-primary/60" />
              </div>
            </div>
            <p className="text-sm font-medium mb-1.5">
              All balances are settled
            </p>
            <p className="text-xs text-muted-foreground">
              Add expenses to track who owes who
            </p>
          </div>
        )}
      </div>
      
      {/* Conditionally render group details as a separate component */}
      {currentGroupId && (
        <GroupDetails 
          groupId={currentGroupId}
          group={currentGroup}
          summary={currentSummary}
          members={currentMembers}
        />
      )}
    </div>
  );
}