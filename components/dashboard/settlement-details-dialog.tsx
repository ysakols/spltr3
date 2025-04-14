"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DialogHeader } from "./dialog-header"
import { format } from "date-fns"

interface SettlementDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settlement: any
}

export function SettlementDetailsDialog({ open, onOpenChange, settlement }: SettlementDetailsDialogProps) {
  if (!settlement) return null

  // Format date for display
  const dateObj = new Date(settlement.rawDate || Date.now())
  const formattedDate = format(dateObj, "MMMM d, yyyy")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader title="settlement details" description="view the details of this payment" />

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">description</p>
              <p className="font-medium">{settlement.description}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">amount</p>
              <p className={`font-medium ${settlement.youPaid ? "text-red-600" : "text-green-600"}`}>
                {settlement.youPaid ? "-" : "+"}${Math.abs(settlement.amount).toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">date</p>
              <p className="font-medium">{formattedDate}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">payment method</p>
              <p className="font-medium">{settlement.method}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">payer</p>
              <p className="font-medium">{settlement.payer.name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">recipient</p>
              <p className="font-medium">{settlement.recipient.name}</p>
            </div>
          </div>

          {settlement.notes && (
            <div>
              <p className="text-sm text-muted-foreground">notes</p>
              <p className="font-medium">{settlement.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
