import React from 'react';
import { Button } from '@/components/ui/button';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { SettlementCalculation } from '@shared/schema';
import { ArrowUpRight } from 'lucide-react';

interface SettlementButtonProps {
  settlement: SettlementCalculation;
  currentUserId: number;
  userMap: Record<string, string>;
  groupId?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  buttonText?: string;
  className?: string;
}

export function SettlementButton({
  settlement,
  currentUserId,
  userMap,
  groupId,
  variant = 'default',
  size = 'default',
  buttonText = 'Settle Up',
  className = ''
}: SettlementButtonProps) {
  const { setSettlementDetails } = useSettlementModal();

  // Only show the button if the current user is the one who owes money
  if (Number(settlement.from) !== currentUserId) {
    return null;
  }

  const handleSettleUp = () => {
    setSettlementDetails({
      fromUserId: Number(settlement.from),
      toUserId: Number(settlement.to),
      amount: settlement.amount,
      groupId,
      fromUsername: userMap[settlement.from] || `User ${settlement.from}`,
      toUsername: userMap[settlement.to] || `User ${settlement.to}`
    });
  };

  return (
    <Button 
      onClick={handleSettleUp}
      variant={variant}
      size={size}
      className={`flex items-center justify-center w-full sm:w-auto ${className}`}
    >
      <ArrowUpRight className="h-4 w-4 mr-1" />
      {buttonText}
    </Button>
  );
}