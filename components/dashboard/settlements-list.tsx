"use client"

import { useState } from "react"
import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { SettlementDetailsDialog } from "./settlement-details-dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { useToast } from "@/hooks/use-toast"

interface SettlementsListProps {
  filter?: "all" | "you-paid" | "you-received"
}

export function SettlementsList({ filter = "all" }: SettlementsListProps) {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null)
  const { toast } = useToast()

  // Mock data for settlements
  const allSettlements = [
    {
      id: "1",
      description: "payment to alex",
      amount: 78.25,
      date: "apr 15, 2023",
      rawDate: "2023-04-15",
      payer: {
        name: "you",
        isYou: true,
      },
      recipient: {
        name: "alex",
        isYou: false,
      },
      method: "venmo",
      youPaid: true,
      youReceived: false,
      notes: "For dinner and museum tickets",
    },
    {
      id: "2",
      description: "payment to jamie",
      amount: 45.75,
      date: "apr 12, 2023",
      rawDate: "2023-04-12",
      payer: {
        name: "you",
        isYou: true,
      },
      recipient: {
        name: "jamie",
        isYou: false,
      },
      method: "cash",
      youPaid: true,
      youReceived: false,
    },
    {
      id: "3",
      description: "payment from taylor",
      amount: 32.5,
      date: "apr 10, 2023",
      rawDate: "2023-04-10",
      payer: {
        name: "taylor",
        isYou: false,
      },
      recipient: {
        name: "you",
        isYou: true,
      },
      method: "bank transfer",
      youPaid: false,
      youReceived: true,
    },
    {
      id: "4",
      description: "payment from sam",
      amount: 18.5,
      date: "apr 5, 2023",
      rawDate: "2023-04-05",
      payer: {
        name: "sam",
        isYou: false,
      },
      recipient: {
        name: "you",
        isYou: true,
      },
      method: "paypal",
      youPaid: false,
      youReceived: true,
    },
    {
      id: "5",
      description: "payment to alex",
      amount: 65.0,
      date: "mar 28, 2023",
      rawDate: "2023-03-28",
      payer: {
        name: "you",
        isYou: true,
      },
      recipient: {
        name: "alex",
        isYou: false,
      },
      method: "venmo",
      youPaid: true,
      youReceived: false,
    },
  ]

  // Filter settlements based on the filter prop
  const filteredSettlements = allSettlements.filter((settlement) => {
    if (filter === "you-paid") return settlement.youPaid
    if (filter === "you-received") return settlement.youReceived
    return true // "all" filter
  })

  const handleViewDetails = (settlement: any) => {
    setSelectedSettlement(settlement)
    setDetailsDialogOpen(true)
  }

  const handleDelete = (settlement: any) => {
    setSelectedSettlement(settlement)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    // In a real app, this would call an API to delete the settlement
    console.log(`Deleting settlement ${selectedSettlement.id}`)
    setDeleteDialogOpen(false)

    toast({
      title: "settlement deleted",
      description: "The settlement has been deleted successfully",
      duration: 3000,
    })
  }

  return (
    <div className="divide-y">
      {filteredSettlements.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">no settlements found</div>
      ) : (
        filteredSettlements.map((settlement) => (
          <div key={settlement.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-600">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm">{settlement.description}</p>
                <div className="mt-1 flex flex-wrap items-center text-xs text-muted-foreground">
                  <div className="flex items-center mr-2">
                    <span>
                      {settlement.payer.name} paid {settlement.recipient.name}
                    </span>
                  </div>
                  <span className="mr-2">via {settlement.method}</span>
                  <span>{settlement.date}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className={`text-xs font-medium ${settlement.youPaid ? "text-red-600" : "text-green-600"}`}>
                  {settlement.youPaid ? `-$${settlement.amount.toFixed(2)}` : `+$${settlement.amount.toFixed(2)}`}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                      <span className="sr-only">more</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem className="text-xs" onSelect={() => handleViewDetails(settlement)}>
                      view details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs text-red-600" onSelect={() => handleDelete(settlement)}>
                      delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))
      )}

      {selectedSettlement && (
        <>
          <SettlementDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            settlement={selectedSettlement}
          />
          <DeleteConfirmationDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={confirmDelete}
            title="delete settlement"
            description="Are you sure you want to delete this settlement? This action cannot be undone."
          />
        </>
      )}
    </div>
  )
}
