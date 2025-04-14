"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DialogHeader } from "./dialog-header"
import { Receipt } from "lucide-react"
import { format } from "date-fns"

interface ExpenseDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: any
}

export function ExpenseDetailsDialog({ open, onOpenChange, expense }: ExpenseDetailsDialogProps) {
  if (!expense) return null

  // Format date for display
  const dateObj = new Date(expense.rawDate || Date.now())
  const formattedDate = format(dateObj, "MMMM d, yyyy")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader title="expense details" description="view the details of this expense" />

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Receipt className="h-6 w-6" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">description</p>
              <p className="font-medium">{expense.description}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">amount</p>
              <p className="font-medium">${expense.amount.toFixed(2)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">date</p>
              <p className="font-medium">{formattedDate}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">paid by</p>
              <p className="font-medium">{expense.payer.name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">your share</p>
              <p className="font-medium text-red-600">-${expense.yourShare.toFixed(2)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">split method</p>
              <p className="font-medium">{expense.split}</p>
            </div>
          </div>

          {expense.group && (
            <div>
              <p className="text-sm text-muted-foreground">group</p>
              <p className="font-medium">{expense.group}</p>
            </div>
          )}

          {expense.notes && (
            <div>
              <p className="text-sm text-muted-foreground">notes</p>
              <p className="font-medium">{expense.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
