"use client"

import { UnifiedExpenseForm } from "@/components/dashboard/unified-expense-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewGroupExpensePage({ params }: { params: { id: string } }) {
  const groupId = params.id

  // Mock data for the group - in a real app, this would be fetched from an API
  const group = {
    id: groupId,
    name:
      groupId === "1"
        ? "roommates"
        : groupId === "2"
          ? "trip to barcelona"
          : groupId === "3"
            ? "office lunch"
            : "game night",
    currency: "USD",
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="icon" className="mr-2" asChild>
          <Link href={`/dashboard/groups/${groupId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-medium">Add Expense to {group.name}</h1>
      </div>

      <UnifiedExpenseForm groupId={groupId} groupName={group.name} groupCurrency={group.currency} />
    </div>
  )
}
