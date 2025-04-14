"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { useModal } from "@/contexts/modal-context"

// Mock data for members - moved outside component to avoid recreation
const MEMBERS = [
  {
    id: "2",
    name: "alex",
    avatar: "a",
    amount: 45.75,
  },
  {
    id: "3",
    name: "jamie",
    avatar: "j",
    amount: 32.5,
  },
]

export function SettleUpModal() {
  const { isSettleUpModalOpen, settleUpModalData, closeModal } = useModal()
  const [date, setDate] = useState<Date>(new Date())
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const { toast } = useToast()
  const { groupId, groupName, preselectedMember } = settleUpModalData

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isSettleUpModalOpen) {
      // Initialize with preselected member if available
      if (preselectedMember) {
        setSelectedMemberId(preselectedMember.id)
        setAmount(Math.abs(preselectedMember.amount).toFixed(2))
      } else {
        // Clear form otherwise
        setSelectedMemberId("")
        setAmount("")
      }
    }
  }, [isSettleUpModalOpen, preselectedMember])

  // Handle member selection and auto-fill amount
  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId)

    // Auto-fill amount based on selected member
    const selectedMember = MEMBERS.find((member) => member.id === memberId)
    if (selectedMember) {
      setAmount(Math.abs(selectedMember.amount).toFixed(2))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, this would call an API to record the payment
    console.log("Recording payment", {
      memberId: selectedMemberId,
      amount,
      date,
    })

    closeModal("settleUp")

    toast({
      title: "payment recorded",
      description: "your payment has been recorded successfully",
      duration: 3000,
    })
  }

  const title = "settle up"
  const description = `record a payment to settle your debts${groupName ? ` in ${groupName}` : ""}`

  return (
    <Dialog open={isSettleUpModalOpen} onOpenChange={(open) => !open && closeModal("settleUp")}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader title={title} description={description} />
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="to">you paid</Label>
              <Select value={selectedMemberId} onValueChange={handleMemberSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="select member" />
                </SelectTrigger>
                <SelectContent>
                  {MEMBERS.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>{member.avatar}</AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                        <span className="text-sm text-muted-foreground">(you owe ${member.amount.toFixed(2)})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">amount</Label>
              <div className="flex items-center gap-2">
                <Select defaultValue="USD">
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
            </div>
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
              <Select defaultValue="cash">
                <SelectTrigger>
                  <SelectValue placeholder="select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">cash</SelectItem>
                  <SelectItem value="bank">bank transfer</SelectItem>
                  <SelectItem value="venmo">venmo</SelectItem>
                  <SelectItem value="paypal">paypal</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">notes (optional)</Label>
              <Textarea id="notes" placeholder="add any additional details about this payment" />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => closeModal("settleUp")}>
              cancel
            </Button>
            <Button type="submit">record payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
