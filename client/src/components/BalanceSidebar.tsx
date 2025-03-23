import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Balance, Settlement, Group } from "@shared/schema";

// For demo purposes, we'll hardcode current user
// This should eventually be replaced with actual auth logic
const CURRENT_USER = "Sam";

export function BalanceSidebar() {
  // Fetch all groups for the user
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
  });
  
  // For each group, fetch the summary directly
  const allGroupSummaries = useQuery<Balance[]>({
    queryKey: ['/api/groups/all-summaries'],
    enabled: groups.length > 0,
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
  
  // We'll also display direct balances from the balance field
  const directBalances: {person: string, amount: number}[] = [];
  
  summaries.forEach(summary => {
    if (summary.balances) {
      // For each person in the balances, figure out who owes what to whom
      Object.entries(summary.balances).forEach(([person, amount]) => {
        if (person !== CURRENT_USER && amount !== 0) {
          // If this person has a positive balance, they owe others
          if (person === CURRENT_USER) {
            // Skip entries for the current user
            return;
          }
          
          // For non-current users
          if (amount > 0) {
            // This person has a positive balance (owes money)
            directBalances.push({ person, amount });
          } else if (amount < 0) {
            // This person has a negative balance (is owed money)
            directBalances.push({ person, amount: -amount });
          }
        }
      });
      
      // Also check the current user's balance
      if (CURRENT_USER in summary.balances) {
        const myBalance = summary.balances[CURRENT_USER];
        if (myBalance < 0) {
          // You owe money (negative balance)
          // Find who you owe to by checking who has positive balances
          Object.entries(summary.balances).forEach(([person, theirBalance]) => {
            if (person !== CURRENT_USER && theirBalance > 0) {
              // This person is owed money, you might owe them
              directBalances.push({ person, amount: -myBalance });
            }
          });
        }
      }
    }
  });
  
  console.log("Direct balances:", directBalances);

  return (
    <div className="h-full p-4 overflow-y-auto">
      <h2 className="font-semibold text-lg mb-4">Balance Summary</h2>
      
      {allSettlements.length === 0 && directBalances.length === 0 ? (
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">
            No settlements to display. Add expenses to see who owes you money.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* People who owe you */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">People who owe you</h3>
            <div className="space-y-2">
              {peopleWhoOweMe.length > 0 ? (
                peopleWhoOweMe
                  .sort((a, b) => b.amount - a.amount)
                  .map((settlement, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium">{settlement.from}</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  ))
              ) : directBalances.some(b => b.amount > 0) ? (
                directBalances
                  .filter(b => b.amount > 0)
                  .map((balance, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium">{balance.person}</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(balance.amount)}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  Nobody owes you money at the moment.
                </div>
              )}
            </div>
          </div>
          
          {/* People you owe */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">You owe</h3>
            <div className="space-y-2">
              {peopleIOwe.length > 0 ? (
                peopleIOwe
                  .sort((a, b) => b.amount - a.amount)
                  .map((settlement, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium">{settlement.to}</span>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(settlement.amount)}
                      </span>
                    </div>
                  ))
              ) : directBalances.some(b => b.amount < 0) ? (
                directBalances
                  .filter(b => b.amount < 0)
                  .map((balance, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium">{balance.person}</span>
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(Math.abs(balance.amount))}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  You don't owe anyone money at the moment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}