"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CreditCard, Bell } from "lucide-react"
import { useState } from "react"
import { ReminderDialog } from "./reminder-dialog"
import { useModal } from "@/contexts/modal-context"

export function BalanceSummary() {
  const [isReminderOpen, setIsReminderOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const { openSettleUpModal } = useModal()

  const balances = [
    {
      id: "1",
      name: "Alex",
      avatar: "A",
      amount: -78.25,
    },
    {
      id: "2",
      name: "Jamie",
      avatar: "J",
      amount: -45.75,
    },
    {
      id: "3",
      name: "Sam",
      avatar: "S",
      amount: -18.5,
    },
    {
      id: "4",
      name: "Taylor",
      avatar: "T",
      amount: 32.5,
    },
  ]

  const handlePayClick = (balance: any) => {
    openSettleUpModal({
      preselectedMember: {
        id: balance.id,
        name: balance.name,
        amount: Math.abs(balance.amount),
      },
    })
  }

  const handleRemindClick = (balance: any) => {
    setSelectedMember({
      id: balance.id,
      name: balance.name,
      amount: Math.abs(balance.amount),
    })
    setIsReminderOpen(true)
  }

  return (
    <div className="divide-y">
      {balances.map((balance) => (
        <div key={balance.id} className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-sm">
                {balance.name.split(" ").length > 1
                  ? `${balance.name.split(" ")[0][0]}${balance.name.split(" ")[1][0]}`.toLowerCase()
                  : balance.name.substring(0, 2).toLowerCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">
                {balance.name.split(" ").length > 1
                  ? `${balance.name.split(" ")[0]} ${balance.name.split(" ")[1][0]}.`
                  : balance.name}
              </p>
              <p
                className={`text-xs ${
                  balance.amount < 0 ? "text-red-600" : balance.amount > 0 ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {balance.amount === 0
                  ? "Settled up"
                  : balance.amount < 0
                    ? `You owe ${balance.name} ${Math.abs(balance.amount).toFixed(2)}`
                    : `${balance.name} owes you ${balance.amount.toFixed(2)}`}
              </p>
            </div>
          </div>
          {balance.amount !== 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs whitespace-nowrap"
              onClick={() => (balance.amount < 0 ? handlePayClick(balance) : handleRemindClick(balance))}
            >
              {balance.amount < 0 ? (
                <>
                  <CreditCard className="mr-1 h-3 w-3" />
                  Settle up
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

      {selectedMember && (
        <ReminderDialog
          open={isReminderOpen}
          onOpenChange={setIsReminderOpen}
          memberName={selectedMember.name}
          amount={selectedMember.amount}
        />
      )}
    </div>
  )
}
