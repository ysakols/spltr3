"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Receipt } from "lucide-react"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { useToast } from "@/hooks/use-toast"

interface ExpenseListProps {
  groupId: string
}

export function ExpenseList({ groupId }: ExpenseListProps) {
  const [editExpenseOpen, setEditExpenseOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentExpense, setCurrentExpense] = useState<any>(null)
  const { toast } = useToast()

  // Mock data for expenses
  const expenses = [
    {
      id: "1",
      description: "dinner at italian restaurant",
      amount: 120.0,
      date: "apr 10, 2023",
      payer: {
        name: "alex",
        avatar: "a",
      },
      split: "equal",
      yourShare: 30.0,
    },
    {
      id: "2",
      description: "hotel reservation",
      amount: 350.0,
      date: "apr 9, 2023",
      payer: {
        name: "jamie",
        avatar: "j",
      },
      split: "equal",
      yourShare: 87.5,
    },
    {
      id: "3",
      description: "museum tickets",
      amount: 85.5,
      date: "apr 8, 2023",
      payer: {
        name: "sam",
        avatar: "s",
      },
      split: "equal",
      yourShare: 21.38,
    },
    {
      id: "4",
      description: "taxi to airport",
      amount: 45.0,
      date: "apr 7, 2023",
      payer: {
        name: "you",
        avatar: "y",
      },
      split: "equal",
      yourShare: 11.25,
    },
    {
      id: "5",
      description: "groceries",
      amount: 65.75,
      date: "apr 6, 2023",
      payer: {
        name: "alex",
        avatar: "a",
      },
      split: "equal",
      yourShare: 16.44,
    },
  ]

  // Update the handleEditExpense function to properly open the edit dialog
  const handleEditExpense = (expense: any) => {
    setCurrentExpense(expense)
    setEditExpenseOpen(true)
  }

  const handleDeleteExpense = (expense: any) => {
    setCurrentExpense(expense)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteExpense = () => {
    // In a real app, this would call an API to delete the expense
    console.log(`Deleting expense ${currentExpense.id}`)
    setDeleteDialogOpen(false)

    toast({
      title: "expense deleted",
      description: "The expense has been deleted successfully",
      duration: 3000,
    })
  }

  return (
    <div className="divide-y">
      {expenses.map((expense) => (
        <div key={expense.id} className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm">{expense.description}</p>
              <div className="mt-1 pt-1 flex flex-wrap items-center text-xs text-muted-foreground">
                <span className="mr-2">
                  {expense.payer.name} paid ${expense.amount.toFixed(2)}
                </span>
                <div className="h-3 w-px bg-gray-300 mx-2"></div>
                <span>{expense.date}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-red-600">-${expense.yourShare.toFixed(2)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                    <span className="sr-only">more</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem className="text-xs" onSelect={() => handleEditExpense(expense)}>
                    edit expense
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-red-600" onSelect={() => handleDeleteExpense(expense)}>
                    delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span className="text-[10px] text-muted-foreground">split: {expense.split}</span>
          </div>
        </div>
      ))}

      {currentExpense && (
        // Make sure the expense object is properly passed to the EditExpenseDialog
        <EditExpenseDialog
          open={editExpenseOpen}
          onOpenChange={setEditExpenseOpen}
          expense={currentExpense}
          groupId={groupId}
        />
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteExpense}
        title="delete expense"
        description="are you sure you want to delete this expense? this action cannot be undone."
      />
    </div>
  )
}
