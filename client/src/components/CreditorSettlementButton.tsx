import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { formatCurrency } from '@/lib/utils';
import { TransactionStatus } from '../../../shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface CreditorSettlementButtonProps {
  fromUserId: number;
  toUserId: number;
  amount: number;
  groupId?: number;
  userName: string;
  transactionId?: number;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function CreditorSettlementButton({
  fromUserId,
  toUserId,
  amount,
  groupId,
  userName,
  transactionId,
  variant = "outline",
  size = "sm",
  className = ""
}: CreditorSettlementButtonProps) {
  const { openModal } = useSettlementModal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Function to mark the transaction as completed
  const markTransactionCompleted = async () => {
    if (transactionId) {
      // If we have a transaction ID, update it directly
      await apiRequest('PUT', `/api/transactions/${transactionId}`, {
        status: TransactionStatus.COMPLETED
      });

      // Show success toast
      toast({
        title: 'Payment confirmed',
        description: `You confirmed receiving ${formatCurrency(amount)} from ${userName}`,
        variant: 'default'
      });

      // Invalidate queries to refresh all affected components
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'settlements'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
      }
      
      // Invalidate global summary for both users
      queryClient.invalidateQueries({ queryKey: ['/api/users', fromUserId, 'global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', toUserId, 'global-summary'] });
    } else {
      // Legacy fallback - create a new settlement record
      console.warn('No transaction ID provided, unable to update transaction status');
      throw new Error('Missing transaction ID');
    }
  };

  const handleMarkReceived = () => {
    openModal({
      title: 'Mark Payment As Received',
      description: `Confirm that you received ${formatCurrency(amount)} from ${userName}.`,
      fromUserId,
      toUserId,
      amount,
      groupId,
      fromUserName: userName,
      isCreditor: true,
      onConfirm: markTransactionCompleted
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className}`}
      onClick={handleMarkReceived}
    >
      <Check className="h-4 w-4 mr-1" />
      Mark Received
    </Button>
  );
}