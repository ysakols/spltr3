import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Balance, Settlement, Group, User } from "@shared/schema";
import { useLocation } from "wouter";
import { useExpenseFunctions } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CircleDollarSign } from 'lucide-react';
import GroupSummary from './GroupSummary';

// For demo purposes, we'll hardcode current user
// This should eventually be replaced with actual auth logic
const CURRENT_USER = "Sam";

export function BalanceSidebar() {
  // Get current location to detect if we're on a group details page
  const [location] = useLocation();
  const groupIdMatch = location.match(/\/groups\/(\d+)/);
  const currentGroupId = groupIdMatch ? parseInt(groupIdMatch[1]) : null;
  
  // Fetch all groups for the user
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
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
  });
  
  // For each group, fetch the summary directly
  const allGroupSummaries = useQuery<Balance[]>({
    queryKey: ['/api/groups/all-summaries'],
    enabled: groups.length > 0,
    // Short polling interval to keep data fresh (5 seconds)
    refetchInterval: 5000,
    // Always refetch on window focus
    refetchOnWindowFocus: true,
    // Each time a group screen is opened, we want to refetch
    staleTime: 0,
    queryFn: async () => {
      if (groups.length === 0) return [];
      
      // Fetch all group summaries
      const summaries: Balance[] = [];
      
      for (const group of groups) {
        try {
          const response = await fetch(`/api/groups/${group.id}/summary`);
          const summary: Balance = await response.json();
          summaries.push(summary);
        } catch (err) {
          console.error(`Failed to fetch summary for group ${group.id}`, err);
        }
      }
      
      return summaries;
    }
  });

  // Extract the data we need
  const isLoading = allGroupSummaries.isLoading;
  const summaries = allGroupSummaries.data || [];
  
  // Combine all the settlements from all groups
  const allSettlements: Settlement[] = [];
  summaries.forEach(summary => {
    if (summary.settlements) {
      allSettlements.push(...summary.settlements);
    }
  });
  
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-20 bg-muted animate-pulse rounded-lg mb-4" />
        <div className="h-14 bg-muted animate-pulse rounded-lg" />
        <div className="h-14 bg-muted animate-pulse rounded-lg mt-2" />
      </div>
    );
  }

  // Log the data for debugging
  console.log("Summaries:", JSON.stringify(summaries));
  console.log("All settlements:", JSON.stringify(allSettlements));
  
  // Extra check for settlements  
  summaries.forEach((summary, idx) => {
    console.log(`Summary ${idx} settlements:`, JSON.stringify(summary.settlements));
  });
  
  // Group settlements by who owes whom and show them
  const peopleWhoOweMe = [...allSettlements.filter(s => s.to === CURRENT_USER)];
  const peopleIOwe = [...allSettlements.filter(s => s.from === CURRENT_USER)];
  
  console.log(`Current User is ${CURRENT_USER}`);
  console.log(`People who owe me: ${JSON.stringify(peopleWhoOweMe)}`);
  console.log(`People I owe: ${JSON.stringify(peopleIOwe)}`);
  
  // We'll use direct balances as a simplified approach based on settlements
  const peopleWhoOweMeDirect: {person: string, amount: number}[] = [];
  const peopleIOweDirect: {person: string, amount: number}[] = [];
  
  // Process the balances data from summaries
  summaries.forEach(summary => {
    if (summary.balances) {
      // Check the current user's balance first
      if (CURRENT_USER in summary.balances) {
        const myBalance = summary.balances[CURRENT_USER];
        
        if (myBalance < 0) {
          // I have a negative balance, so I owe money to others
          Object.entries(summary.balances).forEach(([person, balance]) => {
            if (person !== CURRENT_USER && balance > 0) {
              // This person has a positive balance, so they are owed money
              peopleIOweDirect.push({ 
                person, 
                amount: Math.min(Math.abs(myBalance), balance) 
              });
            }
          });
        } else if (myBalance > 0) {
          // I have a positive balance, so others owe me money
          Object.entries(summary.balances).forEach(([person, balance]) => {
            if (person !== CURRENT_USER && balance < 0) {
              // This person has a negative balance, so they owe money
              peopleWhoOweMeDirect.push({ 
                person, 
                amount: Math.min(myBalance, Math.abs(balance)) 
              });
            }
          });
        }
      }
    }
  });
  
  console.log("People who owe me directly:", peopleWhoOweMeDirect);
  console.log("People I owe directly:", peopleIOweDirect);

  return (
    <div className="h-full p-2.5 overflow-y-auto text-sm">
      <h2 className="font-semibold mb-3 text-base">Balance Summary</h2>
      
      {/* Global Balance Section */}
      {allSettlements.length === 0 && peopleWhoOweMeDirect.length === 0 && peopleIOweDirect.length === 0 ? (
        <div className="border rounded-lg p-2.5 bg-card mb-4">
          <p className="text-xs text-muted-foreground">
            No settlements to display. Add expenses to see who owes you money.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {/* People who owe you */}
          <div className="border rounded-lg p-2.5 bg-card">
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">People who owe you</h3>
            <div className="space-y-1.5">
              {peopleWhoOweMe.length > 0 ? (
                peopleWhoOweMe
                  .sort((a, b) => b.amount - a.amount)
                  .map((settlement, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium text-sm">{settlement.from}</span>
                      <span className="text-green-600 font-semibold text-sm">
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  ))
              ) : peopleWhoOweMeDirect.length > 0 ? (
                peopleWhoOweMeDirect
                  .sort((a, b) => b.amount - a.amount)
                  .map((balance, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium text-sm">{balance.person}</span>
                      <span className="text-green-600 font-semibold text-sm">
                        {formatCurrency(balance.amount)}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  Nobody owes you money at the moment.
                </div>
              )}
            </div>
          </div>
          
          {/* People you owe */}
          <div className="border rounded-lg p-2.5 bg-card">
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">You owe</h3>
            <div className="space-y-1.5">
              {peopleIOwe.length > 0 ? (
                peopleIOwe
                  .sort((a, b) => b.amount - a.amount)
                  .map((settlement, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium text-sm">{settlement.to}</span>
                      <span className="text-red-600 font-semibold text-sm">
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  ))
              ) : peopleIOweDirect.length > 0 ? (
                peopleIOweDirect
                  .sort((a, b) => b.amount - a.amount)
                  .map((balance, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium text-sm">{balance.person}</span>
                      <span className="text-red-600 font-semibold text-sm">
                        {formatCurrency(balance.amount)}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-xs text-muted-foreground">
                  You don't owe anyone money at the moment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Current Group Details Section - Only show when on a group page */}
      {currentGroupId && currentGroup && currentSummary && currentMembers && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3 text-base">Group Summary</h2>
          <GroupSummary 
            group={currentGroup} 
            summary={currentSummary}
            members={currentMembers}
          />
        </div>
      )}
    </div>
  );
}