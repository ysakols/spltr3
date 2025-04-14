"use client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns"

interface ExpenseCardProps {
  expense: {
    id: string
    description: string
    amount: number
    date: string | Date
    payer: {
      name: string
      avatar: string
      isYou?: boolean
    }
    group?: string
    split: string
    yourShare: number
    notes?: string
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onViewDetails?: (id: string) => void
  className?: string
}

export function ExpenseCard({ expense, onEdit, onDelete, onViewDetails, className }: ExpenseCardProps) {
  // Format the date for display
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date

    if (isToday(dateObj)) return "Today"
    if (isYesterday(dateObj)) return "Yesterday"
    if (isThisWeek(dateObj)) return format(dateObj, "EEEE") // Day name
    if (isThisMonth(dateObj)) return format(dateObj, "MMM d") // Month + day
    return format(dateObj, "MMM d, yyyy") // Full date
  }

  // Format the amount for screen readers
  const formatAmountForScreenReader = () => {
    return `You ${expense.payer.isYou ? "paid" : "owe"} ${Math.abs(expense.yourShare).toFixed(2)} dollars`
  }

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-elevated", className)}>
      <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100"
            aria-hidden="true"
          >
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-medium">{expense.description}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center text-xs text-muted-foreground">
              <span className="mr-2">{expense.payer.name} paid</span>
              {expense.group && (
                <Badge variant="outline" className="mr-2 px-1 py-0 text-[10px]">
                  {expense.group}
                </Badge>
              )}
              <time dateTime={new Date(expense.date).toISOString()}>{formatDate(expense.date)}</time>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={cn("text-sm font-medium", expense.payer.isYou ? "text-income" : "text-expense")}
            aria-label={formatAmountForScreenReader()}
          >
            {expense.payer.isYou ? "+" : "-"}${Math.abs(expense.yourShare).toFixed(2)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => onViewDetails?.(expense.id)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => onEdit?.(expense.id)}>
                Edit expense
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs text-expense cursor-pointer" onClick={() => onDelete?.(expense.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {expense.notes && <p className="mt-2 text-xs text-muted-foreground">{expense.notes}</p>}
      </CardContent>
      <CardFooter className="px-4 py-2 border-t bg-muted/20 flex justify-between">
        <div className="flex items-center">
          <Avatar className="h-6 w-6 mr-2">
            <AvatarFallback className="text-[10px]">{expense.payer.avatar}</AvatarFallback>
          </Avatar>
          <span className="text-xs">{expense.payer.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">Split: {expense.split}</span>
      </CardFooter>
    </Card>
  )
}
