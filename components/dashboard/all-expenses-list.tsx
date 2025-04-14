"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Receipt } from "lucide-react"
import { useState } from "react"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"

interface AllExpensesListProps {
  filter?: "all" | "you-paid" | "you-owe"
}

export function AllExpensesList({ filter = "all" }: AllExpensesListProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<any>(null)

  // Mock data for expenses
  const allExpenses = [
    {
      id: "1",
      description: "dinner at italian restaurant",
      amount: 120.0,
      date: "apr 10, 2023",
      payer: {
        name: "alex",
        avatar: "a",
        isYou: false,
      },
      group: "trip to barcelona",
      split: "equal",
      yourShare: 30.0,
      youPaid: false,
    },
    {
      id: "2",
      description: "hotel reservation",
      amount: 350.0,
      date: "apr 9, 2023",
      payer: {
        name: "jamie",
        avatar: "j",
        isYou: false,
      },
      group: "trip to barcelona",
      split: "equal",
      yourShare: 87.5,
      youPaid: false,
    },
    {
      id: "3",
      description: "groceries",
      amount: 85.5,
      date: "apr 8, 2023",
      payer: {
        name: "sam",
        avatar: "s",
        isYou: false,
      },
      group: "roommates",
      split: "equal",
      yourShare: 21.38,
      youPaid: false,
    },
    {
      id: "4",
      description: "taxi to airport",
      amount: 45.0,
      date: "apr 7, 2023",
      payer: {
        name: "you",
        avatar: "y",
        isYou: true,
      },
      group: "trip to barcelona",
      split: "equal",
      yourShare: 11.25,
      youPaid: true,
    },
    {
      id: "5",
      description: "lunch",
      amount: 65.75,
      date: "apr 6, 2023",
      payer: {
        name: "you",
        avatar: "y",
        isYou: true,
      },
      group: "office lunch",
      split: "equal",
      yourShare: 16.44,
      youPaid: true,
    },
  ]

  // Filter expenses based on the filter prop
  const filteredExpenses = allExpenses.filter((expense) => {
    if (filter === "you-paid") return expense.youPaid
    if (filter === "you-owe") return !expense.youPaid && expense.yourShare > 0
    return true // "all" filter
  })

  // Handle edit expense action
  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense)
    setIsEditDialogOpen(true)
  }

  // Handle delete expense action
  const handleDeleteExpense = (expense: any) => {
    setSelectedExpense(expense)
    setIsDeleteDialogOpen(true)
  }

  // Handle confirm delete
  const handleConfirmDelete = () => {
    console.log(`Deleting expense: ${selectedExpense?.id}`)
    // Here you would typically call an API to delete the expense
    // After successful deletion, you would update the UI
    setIsDeleteDialogOpen(false)
    setSelectedExpense(null)
  }

  // Handle dialog close
  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open)
    if (!open) {
      // Clear the selected expense when the dialog closes
      setSelectedExpense(null)
    }
  }

  // Handle delete dialog close
  const handleDeleteDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open)
    if (!open) {
      // Clear the selected expense when the dialog closes
      setSelectedExpense(null)
    }
  }

  return (
    <div className="divide-y">
      {filteredExpenses.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">no expenses found</div>
      ) : (
        filteredExpenses.map((expense) => (
          <div key={expense.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm">{expense.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {expense.payer.name} paid ${expense.amount.toFixed(2)}
                  </span>
                  <div className="h-3 w-px bg-gray-300"></div>
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">
                    {expense.group}
                  </span>
                  <div className="h-3 w-px bg-gray-300"></div>
                  <span>{expense.date}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-red-600">
                  {expense.youPaid
                    ? `+$${(expense.amount - expense.yourShare).toFixed(2)}`
                    : `-$${expense.yourShare.toFixed(2)}`}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                      <span className="sr-only">more</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem className="text-xs" onClick={() => handleEditExpense(expense)}>
                      edit expense
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs text-red-600" onClick={() => handleDeleteExpense(expense)}>
                      delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className="text-[10px] text-muted-foreground">split: {expense.split}</span>
            </div>
          </div>
        ))
      )}

      {/* Edit Dialog - Only render when we have a selected expense */}
      {selectedExpense && (
        <EditExpenseDialog
          open={isEditDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          expense={selectedExpense}
          groupId={selectedExpense.group}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={handleConfirmDelete}
        title="Delete Expense"
        description={
          selectedExpense
            ? `Are you sure you want to delete "${selectedExpense.description}"? This action cannot be undone.`
            : "Are you sure you want to delete this expense? This action cannot be undone."
        }
      />
    </div>
  )
}
