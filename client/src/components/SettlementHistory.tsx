import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settlement, PaymentMethod, SettlementStatus } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Banknote, 
  ArrowUpRight, 
  HelpCircle 
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SettlementHistoryProps {
  userId: number;
  groupId?: number;
}

export function SettlementHistory({ userId, groupId }: SettlementHistoryProps) {
  // Fetch settlements based on context (global or group-specific)
  const queryKey = groupId 
    ? [`/api/groups/${groupId}/settlements`]
    : [`/api/users/${userId}/settlements`];
  
  const { data: settlements, isLoading } = useQuery<Settlement[]>({
    queryKey,
  });

  // Fetch all users to get usernames
  const { data: users = [] } = useQuery<{ id: number; firstName: string; lastName: string; displayName: string; email: string }[]>({
    queryKey: ['/api/users'],
  });

  // Create a mapping of user IDs to usernames
  const userMap: Record<number, string> = {};
  users.forEach((user) => {
    userMap[user.id] = user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.displayName || 'User';
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!settlements || settlements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            No settlement history found. 
            {groupId ? ' This group has no settlements yet.' : ' You have no settlements yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Method to render the appropriate icon based on payment method
  const getMethodIcon = (method: string) => {
    switch (method) {
      case PaymentMethod.CASH:
        return <Banknote className="h-4 w-4" />;
      case PaymentMethod.VENMO:
        return <ArrowUpRight className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  // Method to render the appropriate status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case SettlementStatus.COMPLETED:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case SettlementStatus.PENDING:
        return <Clock className="h-4 w-4 text-amber-500" />;
      case SettlementStatus.CANCELED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  // Method to render a badge based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case SettlementStatus.COMPLETED:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case SettlementStatus.PENDING:
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case SettlementStatus.CANCELED:
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Canceled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Settlement History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settlements.map((settlement) => {
          const isFromCurrentUser = settlement.fromUserId === userId;
          const otherUserId = isFromCurrentUser ? settlement.toUserId : settlement.fromUserId;
          const otherUsername = userMap[otherUserId] || `User ${otherUserId}`;
          
          return (
            <div 
              key={settlement.id} 
              className="border rounded-md p-3 hover:bg-accent/5 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-1">
                    {getStatusIcon(settlement.status)}
                    <span className="ml-2 font-medium">
                      {isFromCurrentUser ? `You paid ${otherUsername}` : `${otherUsername} paid you`}
                    </span>
                  </div>
                  
                  <div className="flex flex-col text-sm text-muted-foreground">
                    <span>
                      {settlement.createdAt && format(new Date(settlement.createdAt), 'MMM d, yyyy')}
                    </span>
                    {settlement.notes && (
                      <span className="mt-1 italic">"{settlement.notes}"</span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-lg">
                    {formatCurrency(parseFloat(settlement.amount.toString()))}
                  </div>
                  
                  <div className="flex items-center justify-end mt-1 space-x-2">
                    <span className="flex items-center text-xs text-muted-foreground">
                      {getMethodIcon(settlement.paymentMethod)}
                      <span className="ml-1 capitalize">{settlement.paymentMethod}</span>
                    </span>
                    {getStatusBadge(settlement.status)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}