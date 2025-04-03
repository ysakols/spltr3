import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { formatCurrency } from '@/lib/utils';

interface CreditorSettlementButtonProps {
  fromUserId: number;
  toUserId: number;
  amount: number;
  groupId?: number;
  userName: string;
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
  variant = "outline",
  size = "sm",
  className = ""
}: CreditorSettlementButtonProps) {
  const { openModal } = useSettlementModal();

  const handleMarkReceived = () => {
    openModal({
      title: 'Mark Payment As Received',
      description: `Confirm that you received ${formatCurrency(amount)} from ${userName}.`,
      fromUserId,
      toUserId,
      amount,
      groupId,
      fromUserName: userName,
      isCreditor: true
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