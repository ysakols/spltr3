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

export function BalanceSidebar() {
  // Get current location to detect if we're on a group details page
  const [location] = useLocation();
  const groupIdMatch = location.match(/\/groups\/(\d+)/);
  const currentGroupId = groupIdMatch ? parseInt(groupIdMatch[1]) : null;
  
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
      <div className="p-4">
        <div className="h-16 bg-muted animate-pulse rounded-lg mb-3" />
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 bg-muted animate-pulse rounded-lg mt-2" />
      </div>
    );
  }
  
  // No data state
  if (!summary) {
    return (
      <div className="h-full p-2.5 overflow-y-auto text-xs">
        <p className="text-muted-foreground">Could not load summary data.</p>
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
        : member.displayName || member.email;
    });
  }
  
  // Then add all other users from the global list
  allUsers.forEach(user => {
    userMap[user.id.toString()] = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.displayName || user.email;
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
    <div className="h-full p-2 overflow-y-auto text-xs">
      <h2 className="font-semibold mb-2.5 text-sm flex items-center">
        <span className="inline-block w-2 h-6 bg-primary mr-2 rounded"></span>
        Balance Summary
      </h2>
      
      {/* Global Balance Section */}
      <div className="space-y-2.5 mb-4">
        {/* Overview Card */}
        <Card className="shadow-sm border-muted/60">
          <CardContent className="p-2.5">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-medium">Total Across All Groups</h3>
                <p className="text-xs text-muted-foreground">
                  {peopleWhoOweMe.length > 0 ? 
                    `${peopleWhoOweMe.length} ${peopleWhoOweMe.length === 1 ? 'person owes' : 'people owe'} you` : 
                    "Nobody owes you"}
                  {peopleIOwe.length > 0 ? 
                    `${peopleWhoOweMe.length > 0 ? '. ' : ' '}You owe ${peopleIOwe.length} ${peopleIOwe.length === 1 ? 'person' : 'people'}` : 
                    peopleWhoOweMe.length === 0 ? " and you don't owe anyone" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* People who owe you */}
        {peopleWhoOweMe.length > 0 && (
          <div className="border rounded-lg p-2 bg-card">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">People who owe you</h3>
            <div className="space-y-1">
              {[...peopleWhoOweMe]
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-medium text-xs">{getUserName(settlement.from)}</span>
                    <span className="text-green-600 font-semibold text-xs">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* People you owe */}
        {peopleIOwe.length > 0 && (
          <div className="border rounded-lg p-2 bg-card">
            <h3 className="text-xs font-medium text-muted-foreground mb-1">You owe</h3>
            <div className="space-y-1">
              {[...peopleIOwe]
                .sort((a, b) => b.amount - a.amount)
                .map((settlement, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-medium text-xs">{getUserName(settlement.to)}</span>
                    <span className="text-red-600 font-semibold text-xs">
                      {formatCurrency(settlement.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* No settlements case */}
        {peopleWhoOweMe.length === 0 && peopleIOwe.length === 0 && (
          <div className="border rounded-lg p-2 bg-card">
            <p className="text-xs text-muted-foreground">
              No settlements to display. Add expenses to see who owes you money.
            </p>
          </div>
        )}
      </div>
      
      {/* Current Group Details Section - Only show when on a group page */}
      {currentGroupId && currentGroup && currentSummary && currentMembers && (
        <div className="mt-6">
          {/* Prominent divider between sections */}
          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/30"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm font-medium text-primary/80">Details</span>
            </div>
          </div>
          
          <h2 className="font-semibold mb-2 text-sm flex items-center">
            <span className="inline-block w-2 h-6 bg-primary mr-2 rounded"></span>
            Group Summary
          </h2>
          <div className="max-h-[50vh] overflow-y-auto pr-1">
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