import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';

import type { User, Settlement } from '@shared/schema';
import { SplitType } from '@shared/schema';
import type { ExtendedExpense } from '@/types';

// Extended Settlement type that includes user info
type ExtendedSettlement = Settlement & {
  fromUser?: {
    id: number;
    firstName: string;
    lastName: string;
    displayName: string;
  };
  toUser?: {
    id: number;
    firstName: string;
    lastName: string;
    displayName: string;
  };
};

type FinancialEvent = {
  type: 'expense' | 'settlement';
  timestamp: string;
  data: ExtendedExpense | ExtendedSettlement;
};

type SplitTypeLabelProps = {
  splitType: SplitType;
};

function SplitTypeLabel({ splitType }: SplitTypeLabelProps) {
  const getBadgeStyle = (type: SplitType) => {
    switch (type) {
      case 'equal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'percentage':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'exact':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Badge className={`${getBadgeStyle(splitType)} font-normal text-xs`}>
      {splitType === 'equal' ? 'Split equally' : 
        splitType === 'percentage' ? 'Split by percentage' : 
        splitType === 'exact' ? 'Split by exact amounts' : 
        'Unknown split type'}
    </Badge>
  );
}

export function FinancialHistory({ groupId }: { groupId: number }) {
  const [financialEvents, setFinancialEvents] = useState<FinancialEvent[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch group expenses
  const { data: expenses = [] } = useQuery<ExtendedExpense[]>({
    queryKey: ['/api/groups', groupId, 'expenses'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/expenses`),
  });

  // Fetch settlements for this group
  const { data: settlements = [] } = useQuery<ExtendedSettlement[]>({
    queryKey: ['/api/groups', groupId, 'settlements'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/settlements`),
  });

  // Combine and sort expenses and settlements by timestamp
  useEffect(() => {
    // Only process if we have valid arrays 
    if (!Array.isArray(expenses) || !Array.isArray(settlements)) {
      return;
    }
    
    // Deep compare to prevent unnecessary updates
    const expenseIds = expenses.map(e => e.id).sort().join(',');
    const settlementIds = settlements.map(s => s.id).sort().join(',');
    
    const expenseEvents: FinancialEvent[] = expenses.map((expense: ExtendedExpense) => ({
      type: 'expense',
      timestamp: String(expense.date || expense.createdAt), // Convert Date to string
      data: expense
    }));

    const settlementEvents: FinancialEvent[] = settlements.map((settlement: ExtendedSettlement) => ({
      type: 'settlement',
      timestamp: String(settlement.createdAt), // Convert Date to string
      data: settlement
    }));

    // Combine all events and sort by timestamp (most recent first)
    const allEvents = [...expenseEvents, ...settlementEvents].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setFinancialEvents(allEvents);
  }, [JSON.stringify({ 
    expenseIds: expenses?.map(e => e.id).sort() || [], 
    settlementIds: settlements?.map(s => s.id).sort() || []
  })]);

  // Filter activities based on active tab
  const filteredEvents = activeTab === 'all' 
    ? financialEvents 
    : financialEvents.filter(event => event.type === activeTab);

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'Cash';
      case 'venmo':
        return 'Venmo';
      case 'other':
        return 'Other';
      default:
        return method;
    }
  };

  const truncateText = (text: string, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Financial History</CardTitle>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
            <TabsTrigger value="settlement">Settlements</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No financial history found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <div key={`${event.type}-${event.type === 'expense' 
                  ? (event.data as ExtendedExpense).id 
                  : (event.data as ExtendedSettlement).id}`}>
                {index > 0 && <Separator className="my-3" />}
                
                {event.type === 'expense' && (
                  <ExpenseEvent 
                    expense={event.data as ExtendedExpense} 
                    formatCurrency={formatCurrency}
                    truncateText={truncateText}
                  />
                )}
                
                {event.type === 'settlement' && (
                  <SettlementEvent 
                    settlement={event.data as ExtendedSettlement} 
                    getStatusColor={getStatusColor}
                    formatPaymentMethod={formatPaymentMethod}
                    formatCurrency={formatCurrency}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for expense events
function ExpenseEvent({ 
  expense, 
  formatCurrency, 
  truncateText
}: { 
  expense: ExtendedExpense, 
  formatCurrency: (amount: number | string) => string,
  truncateText: (text: string, maxLength?: number) => string
}) {
  // Format date for display
  const formattedDate = expense.date 
    ? format(new Date(expense.date), 'MMM d, yyyy')
    : format(new Date(expense.createdAt), 'MMM d, yyyy');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Expense</span>
        <SplitTypeLabel splitType={expense.splitType as SplitType} />
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
        <div className="flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-left w-auto max-w-[150px] truncate">
                <span className="text-sm font-medium">{expense.description}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{expense.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex-none">
          <span className="text-sm font-bold">
            {formatCurrency(expense.amount)}
          </span>
        </div>
      </div>
      <div className="flex flex-col xs:flex-row text-xs text-muted-foreground gap-x-2">
        <div>
          <span className="font-medium">Paid by:</span> {expense.paidByUser?.firstName} {expense.paidByUser?.lastName}
        </div>
        <div>
          <span className="font-medium">Created by:</span> {expense.createdByUser?.firstName} {expense.createdByUser?.lastName}
        </div>
        <div className="ml-auto">
          {formattedDate}
        </div>
      </div>
    </div>
  );
}

// Component for settlement events
function SettlementEvent({ 
  settlement, 
  getStatusColor,
  formatPaymentMethod,
  formatCurrency
}: { 
  settlement: ExtendedSettlement, 
  getStatusColor: (status: string) => string,
  formatPaymentMethod: (method: string) => string,
  formatCurrency: (amount: number | string) => string
}) {
  const amount = typeof settlement.amount === 'string' 
    ? parseFloat(settlement.amount) 
    : settlement.amount;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Settlement</span>
        <Badge className={`${getStatusColor(settlement.status)} font-normal`}>
          {settlement.status}
        </Badge>
      </div>
      <p className="text-sm">
        <span className="font-medium">
          {settlement.fromUser 
            ? `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}` 
            : `User ${settlement.fromUserId}`}
        </span> 
        paid 
        <span className="font-medium">
          {' '}{settlement.toUser 
            ? `${settlement.toUser.firstName} ${settlement.toUser.lastName}` 
            : `User ${settlement.toUserId}`}{' '}
        </span>
        <span className="font-bold">{formatCurrency(amount)}</span> via {formatPaymentMethod(settlement.paymentMethod)}
      </p>
      {settlement.notes && (
        <p className="text-xs italic">"{settlement.notes}"</p>
      )}
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(settlement.createdAt), { addSuffix: true })}
        </span>
        {settlement.completedAt && (
          <span className="text-xs text-muted-foreground">
            Completed {formatDistanceToNow(new Date(settlement.completedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}