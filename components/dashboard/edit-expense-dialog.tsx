"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { DialogHeader } from "./dialog-header"

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: any
  groupId: string
}

export function EditExpenseDialog({ open, onOpenChange, expense, groupId }: EditExpenseDialogProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [splitType, setSplitType] = useState("equal")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (expense) {
      setDescription(expense.description)
      setAmount(expense.amount.toString())

      // More robust date parsing
      try {
        // Check if expense.date is a valid string
        if (typeof expense.date === "string" && expense.date.trim()) {
          // Try to parse the date string
          const parsedDate = new Date(expense.date)

          // Check if the parsed date is valid
          if (!isNaN(parsedDate.getTime())) {
            setDate(parsedDate)
          } else {
            // Fallback to current date if parsing fails
            setDate(new Date())
          }
        } else {
          // Fallback to current date if expense.date is not a valid string
          setDate(new Date())
        }
      } catch (error) {
        console.error("Error parsing date:", error)
        // Fallback to current date if any error occurs
        setDate(new Date())
      }
    }
  }, [expense])

  // Mock data for members
  const members = [
    {
      id: "1",
      name: "you",
      avatar: "y",
    },
    {
      id: "2",
      name: "alex",
      avatar: "a",
    },
    {
      id: "3",
      name: "jamie",
      avatar: "j",
    },
    {
      id: "4",
      name: "sam",
      avatar: "s",
    },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // In a real app, this would call an API to update the expense
    console.log("Updating expense", {
      id: expense.id,
      description,
      amount,
      date,
      splitType,
    })

    onOpenChange(false)

    toast({
      title: "expense updated",
      description: "The expense has been updated successfully",
      duration: 3000,
    })
  }

  const handleSplitEqually = () => {
    // Calculate equal splits for all members
    const equalPercentage = 100 / members.length
    const equalAmount = Number.parseFloat(amount) / members.length

    // In a real app, you would update the state of each member's share
    console.log(`Each member pays ${equalPercentage.toFixed(2)}% or $${equalAmount.toFixed(2)}`)

    toast({
      title: "split equally",
      description: `Split equally among ${members.length} members`,
      duration: 3000,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader title="edit expense" description="update the expense details" />
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">description</Label>
              <Input
                id="description"
                placeholder="e.g., dinner, taxi, groceries"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
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
                <Label htmlFor="payer">paid by</Label>
                <Select defaultValue={expense.payer.name === "you" ? "1" : "2"}>
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
            </div>
            <div className="grid gap-2">
              <Label>split</Label>
              <Tabs defaultValue="equal" onValueChange={setSplitType}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="equal">equal</TabsTrigger>
                  <TabsTrigger value="percent">percent</TabsTrigger>
                  <TabsTrigger value="exact">exact</TabsTrigger>
                </TabsList>
                <TabsContent value="equal" className="pt-4">
                  <p className="text-sm text-muted-foreground">split equally among all members</p>
                  <div className="mt-4 space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{member.avatar}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                        <span className="text-sm">25%</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="percent" className="pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">split by percentage</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleSplitEqually}>
                      split equally
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{member.avatar}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-20" defaultValue="25" min="0" max="100" />
                          <span>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="exact" className="pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-muted-foreground">split by exact amounts</p>
                    <Button type="button" variant="outline" size="sm" onClick={handleSplitEqually}>
                      split equally
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{member.avatar}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>$</span>
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            defaultValue={(Number.parseFloat(amount) / members.length).toFixed(2)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              cancel
            </Button>
            <Button type="submit">save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
