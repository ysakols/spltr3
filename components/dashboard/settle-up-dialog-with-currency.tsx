"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { DialogHeader } from "./dialog-header"
import { CurrencySelector } from "@/components/currency/currency-selector"
import { useCurrency } from "@/contexts/currency-context"
import { CurrencyAmount } from "@/components/currency/currency-amount"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SettleUpDialogWithCurrencyProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName: string
  groupCurrency?: string
  preselectedMember?: {
    id: string
    name: string
    amount: number
    currency?: string
  }
}

export function SettleUpDialogWithCurrency({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupCurrency,
  preselectedMember,
}: SettleUpDialogWithCurrencyProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [amount, setAmount] = useState(preselectedMember?.amount.toString() || "")
  const [selectedMemberId, setSelectedMemberId] = useState(preselectedMember?.id || "")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [notes, setNotes] = useState("")
  const { toast } = useToast()
  const { userPreference, currencies, convertAmount } = useCurrency()

  // Use preselected member's currency, group currency, or user's default
  const [selectedCurrency, setSelectedCurrency] = useState(
    preselectedMember?.currency || groupCurrency || userPreference.defaultCurrency,
  )

  const [showCurrencyMismatchWarning, setShowCurrencyMismatchWarning] = useState(false)

  // Check if there's a currency mismatch when the dialog opens or currency changes
  useState(() => {
    if (preselectedMember?.currency && selectedCurrency !== preselectedMember.currency) {
      setShowCurrencyMismatchWarning(true)
    } else {
      setShowCurrencyMismatchWarning(false)
    }
  })

  // Mock data for members
  const members = [
    {
      id: "1",
      name: "alex",
      avatar: "a",
    },
    {
      id: "2",
      name: "jamie",
      avatar: "j",
    },
    {
      id: "3",
      name: "sam",
      avatar: "s",
    },
    {
      id: "4",
      name: "taylor",
      avatar: "t",
    },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onOpenChange(false)

    toast({
      title: "payment recorded",
      description: "your payment has been recorded successfully",
      duration: 3000,
    })
  }

  // Handle currency change
  const handleCurrencyChange = async (currency: string) => {
    setSelectedCurrency(currency)

    // Show warning if currency differs from preselected member's currency
    if (preselectedMember?.currency && currency !== preselectedMember.currency) {
      setShowCurrencyMismatchWarning(true)

      // Convert the amount if we have a preselected amount
      if (preselectedMember.amount) {
        try {
          const convertedAmount = await convertAmount(preselectedMember.amount, preselectedMember.currency, currency)
          setAmount(convertedAmount.toFixed(2))
        } catch (error) {
          console.error("Failed to convert amount:", error)
        }
      }
    } else {
      setShowCurrencyMismatchWarning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader title="settle up" description={`record a payment ${groupName ? `in ${groupName}` : ""}`} />
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member">who did you pay?</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId} disabled={!!preselectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{member.avatar}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">how much did you pay?</Label>
              <div className="flex items-center gap-2">
                <CurrencySelector
                  value={selectedCurrency}
                  onChange={handleCurrencyChange}
                  triggerClassName="w-24"
                  className="w-[200px]"
                />
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">{currencies[selectedCurrency]?.symbol || selectedCurrency}</span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    required
                  />
                </div>
              </div>

              {showCurrencyMismatchWarning && (
                <Alert variant="warning" className="mt-2">
                  <AlertDescription>
                    you're recording a payment in a different currency than the original debt. the amount has been
                    converted automatically.
                  </AlertDescription>
                </Alert>
              )}

              {preselectedMember && (
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">original debt: </span>
                  <CurrencyAmount
                    amount={preselectedMember.amount}
                    currency={preselectedMember.currency || userPreference.defaultCurrency}
                    isNegative={true}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="method">payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">cash</SelectItem>
                    <SelectItem value="venmo">venmo</SelectItem>
                    <SelectItem value="paypal">paypal</SelectItem>
                    <SelectItem value="bank transfer">bank transfer</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="add any details about this payment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              cancel
            </Button>
            <Button type="submit">record payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
