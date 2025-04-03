import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Balance, Settlement, Group, User } from "@shared/schema";
import { useLocation } from "wouter";
import { Card, CardContent } from '@/components/ui/card';
import { Users, Check } from 'lucide-react';
import GroupSummary from './GroupSummary';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { getQueryFn } from '@/lib/queryClient';
import { displayToNumericId } from '@/lib/id-utils';
import { useSettlementModal } from '@/hooks/use-settlement-modal';

export function BalanceSidebar() {
  // Get current location to detect if we're on a group details page
  const [location] = useLocation();
  const groupIdMatch = location.match(/\/groups\/([a-zA-Z0-9]+)/);
  const currentGroupId = groupIdMatch ? displayToNumericId(groupIdMatch[1]) : null;
  
  // Get the current user first
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }),
    staleTime: 60000,
    retry: false
  });
  
  // Use current user ID or fallback to userId 3 for demo purposes
  const userId = currentUser?.id || 3;
  
  // Fetch all groups for the user
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
  
  // Get all users for usernames
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // If on a group details page, fetch additional data for the current group
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
  
  // Fetch global summary for the current user
  const { data: summary, isLoading } = useQuery<Balance>({
    queryKey: [`/api/users/${userId}/global-summary`],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 2000,
    gcTime: 30000,
  });
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted animate-pulse rounded-md w-2/3"></div>
            <div className="h-3 bg-muted animate-pulse rounded-md w-1/2"></div>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-card/50">
          <div className="h-4 bg-muted animate-pulse rounded-md w-3/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted animate-pulse rounded-md w-full"></div>
            <div className="h-3 bg-muted animate-pulse rounded-md w-5/6"></div>
            <div className="h-3 bg-muted animate-pulse rounded-md w-4/5"></div>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-card/50">
          <div className="h-4 bg-muted animate-pulse rounded-md w-1/2 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted animate-pulse rounded-md w-full"></div>
            <div className="h-3 bg-muted animate-pulse rounded-md w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // No data state
  if (!summary) {
    return (
      <div className="h-full p-4 overflow-y-auto">
        <div className="rounded-lg border border-border p-4 text-center bg-muted/20">
          <p className="text-sm text-muted-foreground">Could not load summary data.</p>
          <p className="text-xs mt-1 text-muted-foreground/80">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }
  
  // Create a mapping of user IDs to usernames
  const userMap: Record<string, string> = {};
  
  // Add current group members first (if any)
  if (currentMembers) {
    currentMembers.forEach(member => {
      userMap[member.id.toString()] = member.name || member.username || 'User';
    });
  }
  
  // Then add all other users from the global list
  allUsers.forEach(user => {
    userMap[user.id.toString()] = user.name || user.username || 'User';
  });
  
  // Log the summary data to see what we're working with
  console.log("Summary data:", summary);
  
  // Get settlements that involve the current user
  const peopleWhoOweMe = summary.settlements.filter(
    s => s.to === userId.toString()
  );
  
  const peopleIOwe = summary.settlements.filter(
    s => s.from === userId.toString()
  );
  
  console.log("People who owe me:", peopleWhoOweMe);
  console.log("People I owe:", peopleIOwe);
  
  // Function to get username from ID
  const getUserName = (userId: string) => {
    return userMap[userId] || `User ${userId}`;
  };

  return (
    <div className="h-full flex flex-col text-sm">
      <div className="flex items-center justify-between p-4 pb-2 border-b flex-shrink-0">
        <h2 className="font-semibold text-base">Balance Summary</h2>
      </div>
      
      {/* Global Balance Section - Fixed portion */}
      <div className="flex-shrink-0 px-4 pt-4">
        {/* People who owe you - Simplified list view with mark received buttons */}
        {peopleWhoOweMe.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 text-green-600 flex items-center">
              <div className="w-1.5 h-1.5 bg-green-500 mr-2 rounded-full"></div>
              Money Owed To You
            </h3>
            <div className="space-y-2">
              {peopleWhoOweMe
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => {
                  const fromUserName = getUserName(settlement.from);
                  
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50/30 rounded-md border border-green-100 shadow-sm">
                      <div>
                        <div className="font-medium text-sm">{fromUserName}</div>
                        <div className="text-green-600 font-medium text-sm">
                          +{formatCurrency(settlement.amount)}
                        </div>
                      </div>
                      <Button
                        variant="outline" 
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 text-xs h-8"
                        onClick={() => {
                          const { openModal } = useSettlementModal.getState();
                          openModal({
                            title: 'Mark Payment As Received',
                            description: `Confirm that you received ${formatCurrency(settlement.amount)} from ${fromUserName}.`,
                            fromUserId: parseInt(settlement.from),
                            toUserId: userId,
                            amount: settlement.amount,
                            fromUserName,
                            isCreditor: true
                          });
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Received
                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* People you owe - Simplified list view */}
        {peopleIOwe.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 text-red-600 flex items-center">
              <div className="w-1.5 h-1.5 bg-red-500 mr-2 rounded-full"></div>
              Money You Owe
            </h3>
            <div className="space-y-2">
              {peopleIOwe
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50/30 rounded-md border border-red-100 shadow-sm">
                    <div className="font-medium text-sm">{getUserName(settlement.to)}</div>
                    <div className="text-red-600 font-medium text-sm">
                      -{formatCurrency(settlement.amount)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* No settlements case */}
        {peopleWhoOweMe.length === 0 && peopleIOwe.length === 0 && (
          <div className="mb-6 p-4 border border-dashed rounded-md text-center bg-muted/5 shadow-sm">
            <div className="mb-2 flex justify-center">
              <div className="bg-primary/5 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary/60" />
              </div>
            </div>
            <p className="text-sm font-medium mb-1">
              All balances are settled
            </p>
            <p className="text-xs text-muted-foreground">
              Add expenses to track who owes who
            </p>
          </div>
        )}
      </div>
      
      {/* Current Group Details Section - Scrollable portion */}
      {currentGroupId && currentGroup && currentSummary && currentMembers && (
        <div className="flex-grow flex flex-col min-h-0 border-t mt-2">
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <h2 className="font-semibold text-base">
              {currentGroup.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Group Summary
            </p>
          </div>
          
          {/* Ensure this div takes remaining space and scrolls internally */}
          <div className="overflow-y-auto px-4 flex-grow">
            <GroupSummary 
              group={currentGroup} 
              summary={currentSummary}
              members={currentMembers}
            />
          </div>
        </div>
      )}
    </div>
  );
}