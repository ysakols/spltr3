"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ExpenseList } from "./expense-list"
import { GroupMembers } from "./group-members"
import { GroupBalances } from "./group-balances"
import { SettleUpDialog } from "./settle-up-dialog"
import { InviteMemberDialog } from "./invite-member-dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { Plus, CreditCard, ArrowLeft, UserPlus, Edit } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { EditGroupDialog } from "./edit-group-dialog"
import { UnifiedExpenseDialog } from "./unified-expense-dialog"

interface GroupDetailProps {
  id: string
}

export function GroupDetail({ id }: GroupDetailProps) {
  const router = useRouter()
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false)
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false)

  // Mock data for the group
  const group = {
    id,
    name: id === "1" ? "roommates" : id === "2" ? "trip to barcelona" : id === "3" ? "office lunch" : "game night",
    description:
      id === "1"
        ? "monthly apartment expenses"
        : id === "2"
          ? "vacation expenses"
          : id === "3"
            ? "weekly team lunches"
            : "monthly game night expenses",
    members: id === "1" ? 3 : id === "2" ? 4 : id === "3" ? 5 : 6,
    totalExpenses: id === "1" ? 1250.75 : id === "2" ? 2340.5 : id === "3" ? 450.25 : 320.0,
    currency: "USD",
    created: "jan 15, 2023",
  }

  const handleDeleteGroup = () => {
    // In a real app, this would call an API to delete the group
    console.log(`Deleting group ${id}`)
    setDeleteDialogOpen(false)
    router.push("/dashboard/groups")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href="/dashboard/groups">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">back</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium md:text-2xl">{group.name}</h1>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsEditGroupOpen(true)}>
                <Edit className="h-3.5 w-3.5" />
                <span className="sr-only">edit group</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteDialogOpen(true)}
          >
            delete group
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsSettleUpOpen(true)}>
            <CreditCard className="mr-1 h-4 w-4" />
            settle up
          </Button>
          <Button size="sm" onClick={() => setIsAddExpenseOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            add expense
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">total expenses</span>
              <span className="text-xl font-medium">${group.totalExpenses.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground mt-1">since {group.created}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">members</span>
              <span className="text-xl font-medium">{group.members}</span>
              <div className="mt-1 flex space-x-1">
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[10px]">as</AvatarFallback>
                </Avatar>
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[10px]">jd</AvatarFallback>
                </Avatar>
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarFallback className="text-[10px]">jj</AvatarFallback>
                </Avatar>
                {group.members > 3 && (
                  <Avatar className="h-5 w-5 border border-background">
                    <AvatarFallback className="text-[10px]">+{group.members - 3}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">your balance</span>
              <span className="text-xl font-medium text-red-600">-$78.25</span>
              <span className="text-xs text-muted-foreground mt-1">you owe money to 2 people</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">currency</span>
              <span className="text-xl font-medium">{group.currency}</span>
              <span className="text-xs text-muted-foreground mt-1">all expenses in this group</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">expenses</CardTitle>
            <CardDescription>all expenses in this group</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ExpenseList groupId={id} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-base">balances</CardTitle>
              <CardDescription>who owes whom in this group</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <GroupBalances groupId={id} />
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">members</CardTitle>
                <CardDescription>people in this group</CardDescription>
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={() => setIsInviteMemberOpen(true)}>
                <UserPlus className="mr-1 h-3 w-3" />
                invite
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <GroupMembers groupId={id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <UnifiedExpenseDialog
        open={isAddExpenseOpen}
        onOpenChange={setIsAddExpenseOpen}
        groupId={id}
        groupName={group.name}
        groupCurrency={group.currency}
      />

      <SettleUpDialog open={isSettleUpOpen} onOpenChange={setIsSettleUpOpen} groupId={id} groupName={group.name} />

      <InviteMemberDialog
        open={isInviteMemberOpen}
        onOpenChange={setIsInviteMemberOpen}
        groupId={id}
        groupName={group.name}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteGroup}
        title="delete group"
        description="are you sure you want to delete this group? all expenses and settlements in this group will be permanently deleted. this action cannot be undone."
      />

      <EditGroupDialog
        open={isEditGroupOpen}
        onOpenChange={setIsEditGroupOpen}
        groupId={id}
        groupName={group.name}
        groupDescription={group.description}
      />
    </div>
  )
}
