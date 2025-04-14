"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search } from "lucide-react"
import { AllExpensesList } from "./all-expenses-list"
import { useState } from "react"
import { UnifiedExpenseDialog } from "./unified-expense-dialog"

export function ExpensesOverview() {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium md:text-2xl">expenses</h1>
          <p className="text-sm text-muted-foreground">track and manage all your expenses across groups</p>
        </div>
        <Button size="sm" className="mt-2 md:mt-0" onClick={() => setIsExpenseDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          add expense
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="search expenses..." className="pl-9 h-9" />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all-time">
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">all time</SelectItem>
              <SelectItem value="this-month">this month</SelectItem>
              <SelectItem value="last-month">last month</SelectItem>
              <SelectItem value="this-year">this year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">all expenses</CardTitle>
          <CardDescription>expenses from all your groups</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AllExpensesList />
        </CardContent>
      </Card>

      <UnifiedExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} />
    </div>
  )
}
