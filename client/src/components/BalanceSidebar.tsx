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
    <div className="h-full p-4 flex flex-col text-sm">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="font-bold text-base inline-flex items-center">
          <div className="w-1 h-6 bg-primary mr-2"></div>
          Balance Summary
        </h2>
      </div>
      
      {/* Global Balance Section - Fixed portion */}
      <div className="space-y-4 mb-6 flex-shrink-0">
        {/* Overview Card */}
        <Card className="shadow-md border-0 overflow-hidden">
          <CardContent className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary/10 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1">Total Across Groups</h3>
                <div className="text-sm text-gray-700 space-y-1">
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
            </div>
          </CardContent>
        </Card>
        
        {/* People who owe you */}
        {peopleWhoOweMe.length > 0 && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center">
                <div className="w-1 h-4 bg-green-500 mr-2"></div>
                People who owe you
              </h3>
              <div className="space-y-3">
                {[...peopleWhoOweMe]
                  .sort((a, b) => b.amount - a.amount)
                  .map((settlement, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="font-medium text-sm truncate max-w-[65%]">{getUserName(settlement.from)}</span>
                      <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1 whitespace-nowrap ml-1">
                        +{formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* People you owe */}
        {peopleIOwe.length > 0 && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center">
                <div className="w-1 h-4 bg-red-500 mr-2"></div>
                You owe
              </h3>
              <div className="space-y-3">
                {[...peopleIOwe]
                  .sort((a, b) => b.amount - a.amount)
                  .map((settlement, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="font-medium text-sm truncate max-w-[65%]">{getUserName(settlement.to)}</span>
                      <span className="text-red-600 font-bold text-sm bg-red-50 px-3 py-1 whitespace-nowrap ml-1">
                        -{formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* No settlements case */}
        {peopleWhoOweMe.length === 0 && peopleIOwe.length === 0 && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-center py-4 px-2">
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-1">
                    No settlements to display
                  </p>
                  <p className="text-sm text-gray-500">
                    Add expenses to see who owes you money
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Current Group Details Section - Scrollable portion */}
      {currentGroupId && currentGroup && currentSummary && currentMembers && (
        <div className="flex-grow flex flex-col min-h-0">
          {/* Prominent divider between sections */}
          <div className="relative py-3 flex-shrink-0 mb-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 py-1 text-sm font-medium text-gray-700 border border-gray-200">
                Current Group
              </span>
            </div>
          </div>
          
          <h2 className="font-bold text-base mb-4 flex items-center flex-shrink-0">
            <div className="w-1 h-6 bg-primary mr-2"></div>
            {currentGroup.name} Summary
          </h2>
          
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