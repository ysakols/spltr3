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
  
  // For debugging, let's always show the button even when no debts exist
  // This will be useful to quickly create settlements with any group member
  // if (usersOwed.length === 0) {
  //   return null;
  // }
  
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
  
  // Get all other group members (not the current user)
  const otherGroupMembers = members.filter(member => member.id !== currentUser.id);
  
  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="default" className="flex items-center justify-center gap-2 h-10 px-4 whitespace-nowrap text-sm">
          <ArrowUpRight className="h-4 w-4" />
          Settle Up
          {dropdownOpen ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {/* Show owed users at the top if there are any */}
        {usersOwed.length > 0 && (
          <>
            {usersOwed.map(({ userId, amount }) => (
              <DropdownMenuItem 
                key={`owed-${userId}`}
                onClick={() => handleSettleUp(userId, amount)}
              >
                Pay {userMap[userId]} ${amount.toFixed(2)} (owed)
              </DropdownMenuItem>
            ))}
            <hr className="my-1 border-t border-gray-200" />
          </>
        )}
        
        {/* Show all other group members */}
        {otherGroupMembers.map(member => (
          <DropdownMenuItem 
            key={member.id}
            // Default to $0 so the user can enter their own amount
            onClick={() => handleSettleUp(member.id, 0)}
          >
            Pay {userMap[member.id]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}