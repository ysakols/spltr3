import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CreditCard, CheckCircle2, Clock, XCircle, Banknote, ArrowUpRight, HelpCircle } from 'lucide-react';

import type { User } from '@shared/schema';
import { SplitType, TransactionType, PaymentMethod, TransactionStatus } from '@shared/schema';

// Extended Transaction type that includes user info
interface TransactionUser {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
}

interface Transaction {
  id: number;
  type: string; // 'expense' or 'settlement'
  description: string;
  amount: string | number;
  paidByUserId: number;
  createdByUserId?: number;
  date: string;
  createdAt: string;
  groupId: number;
  // Expense-specific fields
  splitType?: string;
  splitDetails?: string;
  // Settlement-specific fields
  toUserId?: number;
  paymentMethod?: string;
  status?: string;
  notes?: string;
  completedAt?: string;
  transactionReference?: string;
  // User details
  paidByUser?: TransactionUser;
  createdByUser?: TransactionUser;
  toUser?: TransactionUser;
}

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
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch transactions for this group (combines both expenses and settlements)
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/groups', groupId, 'transactions'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/transactions`),
  });

  // Filter transactions based on active tab
  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(transaction => 
        transaction.type.toLowerCase() === activeTab.toLowerCase()
      );

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
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No financial history found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction, index) => (
              <div key={`transaction-${transaction.id}`}>
                {index > 0 && <Separator className="my-3" />}
                
                {transaction.type.toLowerCase() === 'expense' && (
                  <TransactionExpenseView 
                    transaction={transaction} 
                    formatCurrency={formatCurrency}
                    truncateText={truncateText}
                  />
                )}
                
                {transaction.type.toLowerCase() === 'settlement' && (
                  <TransactionSettlementView 
                    transaction={transaction} 
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

// Component for expense transactions
function TransactionExpenseView({ 
  transaction, 
  formatCurrency, 
  truncateText
}: { 
  transaction: Transaction, 
  formatCurrency: (amount: number | string) => string,
  truncateText: (text: string, maxLength?: number) => string
}) {
  // Format date for display
  const formattedDate = transaction.date 
    ? format(new Date(transaction.date), 'MMM d, yyyy')
    : format(new Date(transaction.createdAt), 'MMM d, yyyy');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Expense</span>
        {transaction.splitType && (
          <SplitTypeLabel splitType={transaction.splitType as SplitType} />
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
        <div className="flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-left w-auto max-w-[150px] truncate">
                <span className="text-sm font-medium">{transaction.description}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transaction.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex-none">
          <span className="text-sm font-bold">
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>
      <div className="flex flex-col xs:flex-row text-xs text-muted-foreground gap-x-2">
        <div>
          <span className="font-medium">Paid by:</span> {transaction.paidByUser?.firstName} {transaction.paidByUser?.lastName}
        </div>
        {transaction.createdByUser && (
          <div>
            <span className="font-medium">Created by:</span> {transaction.createdByUser.firstName} {transaction.createdByUser.lastName}
          </div>
        )}
        <div className="ml-auto">
          {formattedDate}
        </div>
      </div>
    </div>
  );
}

// Component for settlement transactions
function TransactionSettlementView({ 
  transaction, 
  getStatusColor,
  formatPaymentMethod,
  formatCurrency
}: { 
  transaction: Transaction, 
  getStatusColor: (status: string) => string,
  formatPaymentMethod: (method: string) => string,
  formatCurrency: (amount: number | string) => string
}) {
  const amount = typeof transaction.amount === 'string' 
    ? parseFloat(transaction.amount) 
    : transaction.amount;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Settlement</span>
        {transaction.status && (
          <Badge className={`${getStatusColor(transaction.status)} font-normal`}>
            {transaction.status}
          </Badge>
        )}
      </div>
      <p className="text-sm">
        <span className="font-medium">
          {transaction.paidByUser 
            ? `${transaction.paidByUser.firstName} ${transaction.paidByUser.lastName}` 
            : `User ${transaction.paidByUserId}`}
        </span> 
        paid 
        <span className="font-medium">
          {' '}{transaction.toUser 
            ? `${transaction.toUser.firstName} ${transaction.toUser.lastName}` 
            : `User ${transaction.toUserId}`}{' '}
        </span>
        <span className="font-bold">{formatCurrency(amount)}</span>
        {transaction.paymentMethod && (
          <> via {formatPaymentMethod(transaction.paymentMethod)}</>
        )}
      </p>
      {transaction.notes && (
        <p className="text-xs italic">"{transaction.notes}"</p>
      )}
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
        </span>
        {transaction.completedAt && (
          <span className="text-xs text-muted-foreground">
            Completed {formatDistanceToNow(new Date(transaction.completedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}