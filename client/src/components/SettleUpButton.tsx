import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Balance, User } from '@shared/schema';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SettleUpButtonProps {
  groupId: number;
  summary: Balance;
  currentUser: User;
  members: User[];
}

export function SettleUpButton({ groupId, summary, currentUser, members }: SettleUpButtonProps) {
  const { setSettlementDetails } = useSettlementModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  if (!summary || !summary.owes) {
    return null;
  }
  
  // Create a map of user IDs to names
  const userMap: Record<string, string> = {};
  members.forEach(member => {
    userMap[member.id] = member.firstName && member.lastName 
      ? `${member.firstName} ${member.lastName}` 
      : member.displayName || member.email || `User ${member.id}`;
  });
  
  // Get all users this user owes money to in this group
  const usersOwed: { userId: number; amount: number }[] = [];
  
  // Loop through the owes object to find who the current user owes money to
  Object.entries(summary.owes).forEach(([fromId, toObject]) => {
    if (Number(fromId) === currentUser.id) {
      Object.entries(toObject).forEach(([toId, amount]) => {
        if (amount > 0) {
          usersOwed.push({ userId: Number(toId), amount });
        }
      });
    }
  });
  
  // If the user doesn't owe anyone, don't show the button
  if (usersOwed.length === 0) {
    return null;
  }
  
  const handleSettleUp = (toUserId: number, amount: number) => {
    setSettlementDetails({
      fromUserId: currentUser.id,
      toUserId,
      amount,
      groupId,
      fromUsername: userMap[currentUser.id] || `User ${currentUser.id}`,
      toUsername: userMap[toUserId] || `User ${toUserId}`
    });
  };
  
  return (
    <div>
      {usersOwed.length === 1 ? (
        // Simple button if only one person is owed
        <Button 
          onClick={() => handleSettleUp(usersOwed[0].userId, usersOwed[0].amount)}
          variant="default"
          className="flex items-center"
        >
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Settle Up
        </Button>
      ) : (
        // Dropdown if multiple people are owed
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Settle Up
              {dropdownOpen ? 
                <ChevronUp className="h-4 w-4 ml-2" /> : 
                <ChevronDown className="h-4 w-4 ml-2" />
              }
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {usersOwed.map(({ userId, amount }) => (
              <DropdownMenuItem 
                key={userId}
                onClick={() => handleSettleUp(userId, amount)}
              >
                Pay {userMap[userId]} ${amount.toFixed(2)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}