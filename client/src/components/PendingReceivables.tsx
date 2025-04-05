import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useSettlementModal } from '@/hooks/use-settlement-modal';

interface PendingReceivablesProps {
  userId: number;
  summaryData: any;
  userMap: Record<string, string>;
}

export function PendingReceivables({ userId, summaryData, userMap }: PendingReceivablesProps) {
  const { openModal } = useSettlementModal();
  
  // Find settlements where the current user is the recipient (creditor)
  const receivables = summaryData?.settlements
    ? summaryData.settlements.filter((s: any) => s.to === userId.toString())
    : [];
  
  if (!receivables.length) {
    return null;
  }
  
  const handleMarkAsReceived = (fromUserId: number, amount: number, fromUserName: string) => {
    openModal({
      title: 'Mark Payment As Received',
      description: `Confirm that you received ${formatCurrency(amount)} from ${fromUserName}.`,
      fromUserId,
      toUserId: userId,
      amount,
      fromUserName,
      isCreditor: true
    });
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <ArrowUpDown className="h-4 w-4 mr-2 text-green-600" />
          Payments You Should Receive
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {receivables.map((settlement: any, idx: number) => {
            const fromUsername = userMap[settlement.from] || `User ${settlement.from}`;
            
            return (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 bg-green-50/30 rounded-md border border-green-100 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback>{getInitials(fromUsername)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{fromUsername}</div>
                    <div className="text-xs text-muted-foreground">Owes you {formatCurrency(settlement.amount)}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 ml-2"
                  onClick={() => handleMarkAsReceived(
                    parseInt(settlement.from),
                    settlement.amount,
                    fromUsername
                  )}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Received
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}