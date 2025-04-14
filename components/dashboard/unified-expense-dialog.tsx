"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DialogHeader } from "./dialog-header"
import { UnifiedExpenseForm } from "./unified-expense-form"

interface UnifiedExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
  groupName?: string
  groupCurrency?: string
}

export function UnifiedExpenseDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupCurrency,
}: UnifiedExpenseDialogProps) {
  const handleComplete = () => {
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader
          title="add an expense"
          description={groupName ? `add a new expense to ${groupName}` : "add a new expense"}
        />
        <UnifiedExpenseForm
          groupId={groupId}
          groupName={groupName}
          groupCurrency={groupCurrency}
          isDialog={true}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
