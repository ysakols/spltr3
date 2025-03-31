import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Balance, Settlement, Group, User } from "@shared/schema";
import { useLocation } from "wouter";
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import GroupSummary from './GroupSummary';
import { SettlementButton } from '@/components/SettlementButton';
import { useState, useEffect } from 'react';
import { getQueryFn } from '@/lib/queryClient';
import { displayToNumericId } from '@/lib/id-utils';

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
      userMap[member.id.toString()] = member.firstName && member.lastName 
        ? `${member.firstName} ${member.lastName}` 
        : member.displayName || 'User';
    });
  }
  
  // Then add all other users from the global list
  allUsers.forEach(user => {
    userMap[user.id.toString()] = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.displayName || 'User';
  });
  
  // Get settlements that involve the current user
  const peopleWhoOweMe = summary.settlements.filter(
    s => s.to === userId.toString()
  );
  
  const peopleIOwe = summary.settlements.filter(
    s => s.from === userId.toString()
  );
  
  // Function to get username from ID
  const getUserName = (userId: string) => {
    return userMap[userId] || `User ${userId}`;
  };

  return (
    <div className="h-full p-4 flex flex-col">
      <h2 className="font-medium text-sm mb-3">Balance Summary</h2>
      
      {/* Global Balance Section */}
      <div className="space-y-3 mb-4">
        {/* Overview Stats */}
        <div className="bg-muted/10 p-3 text-sm">
          <div className="flex items-center gap-3 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">Total Across Groups</span>
          </div>
          <div className="text-muted-foreground text-sm mt-1">
            {peopleWhoOweMe.length > 0 && (
              <p>
                {peopleWhoOweMe.length} {peopleWhoOweMe.length === 1 ? 'person owes' : 'people owe'} you
              </p>
            )}
            {peopleIOwe.length > 0 && (
              <p>
                You owe {peopleIOwe.length} {peopleIOwe.length === 1 ? 'person' : 'people'}
              </p>
            )}
            {peopleWhoOweMe.length === 0 && peopleIOwe.length === 0 && (
              <p>No pending balances</p>
            )}
          </div>
        </div>
        
        {/* People who owe you */}
        {peopleWhoOweMe.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-green-600">People who owe you</h3>
            <div className="space-y-2">
              {[...peopleWhoOweMe]
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm truncate max-w-[60%]">{getUserName(settlement.from)}</span>
                    <span className="text-green-600 font-medium text-sm whitespace-nowrap">
                      +{formatCurrency(settlement.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* People you owe */}
        {peopleIOwe.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-red-600">You owe</h3>
            <div className="space-y-2">
              {[...peopleIOwe]
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm truncate max-w-[60%]">{getUserName(settlement.to)}</span>
                    <span className="text-red-600 font-medium text-sm whitespace-nowrap">
                      -{formatCurrency(settlement.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* No settlements case */}
        {peopleWhoOweMe.length === 0 && peopleIOwe.length === 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              No settlements to display
            </p>
          </div>
        )}
      </div>
      
      {/* Current Group Details Section - Scrollable portion */}
      {currentGroupId && currentGroup && currentSummary && currentMembers && (
        <div className="flex-grow flex flex-col min-h-0">
          {/* Simple divider between sections */}
          <div className="border-t pt-3 mb-2">
            <h2 className="font-medium text-sm mb-2">{currentGroup.name}</h2>
          </div>
          
          {/* Ensure this div takes remaining space and scrolls internally */}
          <div className="overflow-y-auto pr-1 flex-grow">
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