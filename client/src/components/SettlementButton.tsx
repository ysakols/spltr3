import React from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { SettlementCalculation, User } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface SettlementButtonProps {
  settlement: SettlementCalculation;
  currentUserId: number;
  userMap: Record<string, string>;
  groupId?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
}

export function SettlementButton({
  settlement,
  currentUserId,
  userMap,
  groupId,
  variant = 'default',
  size = 'sm',
  buttonText
}: SettlementButtonProps) {
  const { setSettlementDetails } = useSettlementModal();
  
  // Only show the button if the current user is the one who owes money
  const isFromCurrentUser = settlement.from === currentUserId.toString();
  
  if (!isFromCurrentUser) {
    return null;
  }
  
  const handleSettleUp = () => {
    setSettlementDetails({
      fromUserId: parseInt(settlement.from),
      toUserId: parseInt(settlement.to),
      amount: settlement.amount,
      groupId: groupId,
      fromUsername: userMap[settlement.from] || `User ${settlement.from}`,
      toUsername: userMap[settlement.to] || `User ${settlement.to}`
    });
  };
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleSettleUp}
      className="ml-2"
    >
      <CreditCard className="h-3 w-3 mr-1" />
      {buttonText || 'Settle Up'}
    </Button>
  );
}