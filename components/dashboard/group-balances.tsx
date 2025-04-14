"use client"

import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CreditCard, Bell } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useModal } from "@/contexts/modal-context"

interface GroupBalancesProps {
  groupId: string
}

export function GroupBalances({ groupId }: GroupBalancesProps) {
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const { toast } = useToast()
  const { openSettleUpModal } = useModal()

  // Mock data for balances
  const balances = [
    {
      id: "1",
      name: "alex",
      avatar: "a",
      amount: -45.75,
    },
    {
      id: "2",
      name: "jamie",
      avatar: "j",
      amount: -32.5,
    },
    {
      id: "3",
      name: "sam",
      avatar: "s",
      amount: 0,
    },
    {
      id: "4",
      name: "taylor",
      avatar: "t",
      amount: 78.25,
    },
  ]

  const handlePayClick = (member: any) => {
    openSettleUpModal({
      groupId,
      preselectedMember: {
        id: member.id,
        name: member.name,
        amount: Math.abs(member.amount),
      },
    })
  }

  const handleRemindClick = (member: any) => {
    setSelectedMember({
      id: member.id,
      name: member.name,
      amount: Math.abs(member.amount),
    })
    setIsReminderOpen(true)
  }

  return (
    <div className="divide-y">
      {balances.map((balance) => (
        <div key={balance.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{balance.avatar.toLowerCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm">{balance.name}</p>
              <p
                className={`text-xs ${
                  balance.amount < 0 ? "text-red-600" : balance.amount > 0 ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {balance.amount === 0
                  ? "settled up"
                  : balance.amount < 0
                    ? `-${Math.abs(balance.amount).toFixed(2)}`
                    : `+${balance.amount.toFixed(2)}`}
              </p>
            </div>
          </div>
          {balance.amount !== 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => (balance.amount < 0 ? handlePayClick(balance) : handleRemindClick(balance))}
            >
              {balance.amount < 0 ? (
                <>
                  <CreditCard className="mr-1 h-3 w-3" />
                  settle up
                </>
              ) : (
                <>
                  <Bell className="mr-1 h-3 w-3" />
                  Remind
                </>
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
