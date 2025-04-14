"use client"

import { useState } from "react"
import { Receipt, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { ExpenseDetailsDialog } from "./expense-details-dialog"
import { SettlementDetailsDialog } from "./settlement-details-dialog"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { useToast } from "@/hooks/use-toast"

interface RecentActivityProps {
  extended?: boolean
  type?: "expense" | "settlement" | "all"
}

export function RecentActivity({ extended = false, type = "all" }: RecentActivityProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseDetailsOpen, setExpenseDetailsOpen] = useState(false)
  const [settlementDetailsOpen, setSettlementDetailsOpen] = useState(false)
  const [editExpenseOpen, setEditExpenseOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const { toast } = useToast()

  const activities = [
    {
      id: "1",
      type: "expense",
      description: "dinner at italian restaurant",
      amount: 120.0,
      date: "today",
      rawDate: "2023-04-15",
      payer: {
        name: "alex",
      },
      group: "trip to barcelona",
      split: "equal",
      yourShare: 30.0,
    },
    {
      id: "2",
      type: "settlement",
      description: "payment to jamie",
      amount: 45.75,
      date: "yesterday",
      rawDate: "2023-04-14",
      payer: {
        name: "you",
      },
      recipient: {
        name: "jamie",
      },
      method: "cash",
      youPaid: true,
      youReceived: false,
    },
    {
      id: "3",
      type: "expense",
      description: "groceries",
      amount: 85.5,
      date: "2 days ago",
      rawDate: "2023-04-13",
      payer: {
        name: "sam",
      },
      group: "roommates",
      split: "equal",
      yourShare: 21.38,
    },
    {
      id: "4",
      type: "expense",
      description: "movie tickets",
      amount: 32.0,
      date: "3 days ago",
      rawDate: "2023-04-12",
      payer: {
        name: "you",
      },
      group: "game night",
      split: "equal",
      yourShare: 8.0,
    },
    {
      id: "5",
      type: "settlement",
      description: "payment to alex",
      amount: 78.25,
      date: "1 week ago",
      rawDate: "2023-04-08",
      payer: {
        name: "you",
      },
      recipient: {
        name: "alex",
      },
      method: "venmo",
      youPaid: true,
      youReceived: false,
    },
  ]

  // Filter activities by type if specified
  const filteredActivities = type === "all" ? activities : activities.filter((activity) => activity.type === type)

  const displayActivities = extended ? filteredActivities : filteredActivities.slice(0, 4)

  const handleViewDetails = (item: any) => {
    setSelectedItem(item)
    if (item.type === "expense") {
      setExpenseDetailsOpen(true)
    } else {
      setSettlementDetailsOpen(true)
    }
  }

  const handleEditExpense = (item: any) => {
    setSelectedItem(item)
    setEditExpenseOpen(true)
  }

  const handleDelete = (item: any) => {
    setSelectedItem(item)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    // In a real app, this would call an API to delete the item
    console.log(`Deleting item ${selectedItem.id}`)
    setDeleteDialogOpen(false)

    toast({
      title: `${selectedItem.type} deleted`,
      description: `The ${selectedItem.type} has been deleted successfully`,
      duration: 3000,
    })
  }

  return (
    <div className="divide-y">
      {displayActivities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-4">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
              activity.type === "expense" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
            }`}
          >
            {activity.type === "expense" ? <Receipt className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm">{activity.description}</p>
              <div className="flex items-center">
                <p
                  className={`whitespace-nowrap text-sm ${activity.type === "expense" ? "text-red-600" : "text-green-600"}`}
                >
                  {activity.type === "expense" ? `-$${activity.amount.toFixed(2)}` : `+$${activity.amount.toFixed(2)}`}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                      <MoreHorizontal className="h-3 w-3" />
                      <span className="sr-only">more</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem className="text-xs" onSelect={() => handleViewDetails(activity)}>
                      view details
                    </DropdownMenuItem>
                    {activity.type === "expense" && (
                      <DropdownMenuItem className="text-xs" onSelect={() => handleEditExpense(activity)}>
                        edit expense
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-xs text-red-600" onSelect={() => handleDelete(activity)}>
                      delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center text-xs text-muted-foreground">
              <div className="flex items-center mr-2">
                {activity.type === "expense" ? (
                  <span>{activity.payer.name} paid</span>
                ) : (
                  <span>
                    {activity.payer.name} paid {activity.recipient.name}
                  </span>
                )}
              </div>
              {activity.type === "expense" && activity.group && (
                <span className="mr-2">
                  in{" "}
                  <Badge variant="outline" className="font-normal text-xs">
                    {activity.group}
                  </Badge>
                </span>
              )}
              {activity.type === "settlement" && activity.method && <span className="mr-2">via {activity.method}</span>}
              <span className="ml-auto">{activity.date}</span>
            </div>
          </div>
        </div>
      ))}

      {selectedItem && (
        <>
          <ExpenseDetailsDialog open={expenseDetailsOpen} onOpenChange={setExpenseDetailsOpen} expense={selectedItem} />
          <SettlementDetailsDialog
            open={settlementDetailsOpen}
            onOpenChange={setSettlementDetailsOpen}
            settlement={selectedItem}
          />
          <EditExpenseDialog
            open={editExpenseOpen}
            onOpenChange={setEditExpenseOpen}
            expense={selectedItem}
            groupId={selectedItem?.groupId || ""}
          />
          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={confirmDelete}
            title={`delete ${selectedItem.type}`}
            description={`Are you sure you want to delete this ${selectedItem.type}? This action cannot be undone.`}
          />
        </>
      )}
    </div>
  )
}
