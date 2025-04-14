"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DialogHeader } from "./dialog-header"
import { UnifiedExpenseForm } from "./unified-expense-form"
import { useModal } from "@/contexts/modal-context"

export function ExpenseModal() {
  const { isExpenseModalOpen, expenseModalData, closeModal } = useModal()
  const { groupId, groupName, groupCurrency } = expenseModalData

  const handleComplete = () => {
    closeModal("expense")
  }

  const handleCancel = () => {
    closeModal("expense")
  }

  return (
    <Dialog open={isExpenseModalOpen} onOpenChange={(open) => !open && closeModal("expense")}>
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
