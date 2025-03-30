import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  HelpCircle,
  MoreVertical,
  Check,
  Trash2,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface SettlementHistoryProps {
  userId: number;
  groupId?: number;
}

export function SettlementHistory({ userId, groupId }: SettlementHistoryProps) {
  const [settlementToUpdate, setSettlementToUpdate] = useState<Settlement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Function to mark a settlement as completed
  const markAsCompleted = async (settlementId: number) => {
    setIsProcessing(true);
    try {
      await apiRequest('PUT', `/api/settlements/${settlementId}`, {
        status: SettlementStatus.COMPLETED,
        completedAt: new Date()
      });
      
      // Invalidate all relevant queries to refresh all UI components
      // This ensures that all tables, summaries, and history are updated

      // First invalidate the specific settlement list we're displaying
      queryClient.invalidateQueries({ queryKey });
      
      // Invalidate all related queries to ensure every component updates
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
      }
      
      // Invalidate user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
      
      toast({
        title: "Success!",
        description: "Settlement marked as completed.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating settlement:', error);
      toast({
        title: "Error",
        description: "Failed to update settlement status.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to cancel a settlement
  const cancelSettlement = async (settlementId: number) => {
    setIsProcessing(true);
    try {
      await apiRequest('PUT', `/api/settlements/${settlementId}`, {
        status: SettlementStatus.CANCELED
      });
      
      // Invalidate all relevant queries to refresh all UI components
      // This ensures that all tables, summaries, and history are updated

      // First invalidate the specific settlement list we're displaying
      queryClient.invalidateQueries({ queryKey });
      
      // Invalidate all related queries to ensure every component updates
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
      }
      
      // Invalidate user-specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
      
      toast({
        title: "Success!",
        description: "Settlement marked as canceled.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error canceling settlement:', error);
      toast({
        title: "Error",
        description: "Failed to cancel settlement.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setSettlementToUpdate(null);
    }
  };

  // Get appropriate icon for settlement status
  const getStatusIcon = (status: string) => {
    switch(status) {
      case SettlementStatus.COMPLETED:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case SettlementStatus.PENDING:
        return <Clock className="h-4 w-4 text-amber-500" />;
      case SettlementStatus.CANCELED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get appropriate icon for payment method
  const getPaymentMethodIcon = (method: string) => {
    switch(method) {
      case PaymentMethod.CASH:
        return <Banknote className="h-4 w-4" />;
      case PaymentMethod.VENMO:
        return <ArrowUpRight className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

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

  return (
    <>
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
                        <span className="mt-1">{settlement.notes}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="font-semibold text-lg mr-3">
                      {formatCurrency(settlement.amount)}
                    </span>
                    
                    {/* Status-dependent actions */}
                    {settlement.status === SettlementStatus.PENDING && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => markAsCompleted(settlement.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSettlementToUpdate(settlement);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel Settlement
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center mt-2 space-x-2">
                  <Badge variant="outline" className="text-xs flex items-center">
                    {getPaymentMethodIcon(settlement.paymentMethod)}
                    <span className="ml-1">{settlement.paymentMethod}</span>
                  </Badge>
                  
                  <Badge 
                    variant={
                      settlement.status === SettlementStatus.COMPLETED 
                        ? "default" 
                        : settlement.status === SettlementStatus.CANCELED 
                          ? "destructive" 
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {settlement.status}
                  </Badge>
                  
                  {groupId ? null : (
                    <Badge variant="outline" className="text-xs">
                      {settlement.groupId ? `Group #${settlement.groupId}` : 'Personal'}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Confirmation dialog for canceling a settlement */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this settlement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settlementToUpdate && cancelSettlement(settlementToUpdate.id)}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, Cancel Settlement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
