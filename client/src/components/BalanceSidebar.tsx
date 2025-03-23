import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Balance, Settlement, Group } from "@shared/schema";

interface CombinedSummary {
  settlements: Settlement[];
  balances?: Record<string, number>;
}

// For demo purposes, we'll hardcode current user
// This should eventually be replaced with actual auth logic
const CURRENT_USER = "Sam";

export function BalanceSidebar() {
  // Fetch all groups for the user
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
  });
  
  // Balances from all groups merged into one overview
  const { data: summaries, isLoading } = useQuery<CombinedSummary>({
    queryKey: ['/api/groups/summaries'],
    enabled: groups.length > 0,
    queryFn: async () => {
      if (groups.length === 0) {
        return { settlements: [] };
      }
      
      // Fetch all group summaries and combine them
      const allSettlements: Settlement[] = [];
      const balanceMap: Record<string, number> = {};
      
      for (const group of groups) {
        try {
          const response = await fetch(`/api/groups/${group.id}/summary`);
          const summary: Balance = await response.json();
          
          // Add settlements
          if (summary.settlements && Array.isArray(summary.settlements)) {
            summary.settlements.forEach(settlement => {
              // Find existing settlement or create new one
              const existingSettlementIdx = allSettlements.findIndex(
                s => s.from === settlement.from && s.to === settlement.to
              );
              
              if (existingSettlementIdx >= 0) {
                allSettlements[existingSettlementIdx].amount += settlement.amount;
              } else {
                allSettlements.push({...settlement});
              }
              
              // Update balance map
              balanceMap[settlement.from] = (balanceMap[settlement.from] || 0) - settlement.amount;
              balanceMap[settlement.to] = (balanceMap[settlement.to] || 0) + settlement.amount;
            });
          }
        } catch (err) {
          console.error(`Failed to fetch summary for group ${group.id}`, err);
        }
      }
      
      return {
        settlements: allSettlements,
        balances: balanceMap
      };
    }
  });

  // Default to empty array if data not yet loaded
  const settlements = summaries?.settlements || [];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-20 bg-muted animate-pulse rounded-lg mb-4" />
        <div className="h-14 bg-muted animate-pulse rounded-lg" />
        <div className="h-14 bg-muted animate-pulse rounded-lg mt-2" />
      </div>
    );
  }

  // Log settlements for debugging
  console.log("Settlements:", settlements);
  
  // Group settlements by who owes whom
  const peopleWhoOweMe = settlements.filter(s => s.to === CURRENT_USER);
  const peopleIOwe = settlements.filter(s => s.from === CURRENT_USER);

  return (
    <div className="h-full p-4 overflow-y-auto">
      <h2 className="font-semibold text-lg mb-4">Balance Summary</h2>
      
      {settlements.length === 0 ? (
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