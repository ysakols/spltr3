import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, CheckCircle } from 'lucide-react';
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
  isCompleted?: boolean;
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
  className = "",
  isCompleted = false
}: CreditorSettlementButtonProps) {
  const { openModal } = useSettlementModal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentReceived, setIsPaymentReceived] = useState(isCompleted);

  // Function to mark the transaction as completed
  const markTransactionCompleted = async () => {
    if (transactionId) {
      setIsProcessing(true);
      try {
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

        // Update local state
        setIsPaymentReceived(true);

        // Invalidate queries to refresh all affected components
        if (groupId) {
          queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
          queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'settlements'] });
          queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
        }
        
        // Invalidate global summary for both users
        queryClient.invalidateQueries({ queryKey: ['/api/users', fromUserId, 'global-summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', toUserId, 'global-summary'] });
      } catch (error) {
        console.error('Error marking transaction completed:', error);
        toast({
          title: 'Error',
          description: 'Could not mark payment as received',
          variant: 'destructive'
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Legacy fallback - create a new settlement record
      console.warn('No transaction ID provided, unable to update transaction status');
      throw new Error('Missing transaction ID');
    }
  };

  const handleMarkReceived = () => {
    // If already received, don't do anything
    if (isPaymentReceived) return;
    
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

  // If payment is already received, show "Received" button with green styling
  if (isPaymentReceived) {
    return (
      <Button
        variant="outline"
        size={size}
        className="text-green-600 bg-green-50 border-green-200 hover:bg-green-100 cursor-default"
        disabled
      >
        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
        Received
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`bg-green-600 hover:bg-green-700 text-white transition-all duration-200 transform hover:scale-105 ${className}`}
      onClick={handleMarkReceived}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Check className="h-4 w-4 mr-1" />
          Mark Received
        </>
      )}
    </Button>
  );
}