"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DialogHeader } from "./dialog-header"

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  amount: number
}

export function ReminderDialog({ open, onOpenChange, memberName, amount }: ReminderDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [message, setMessage] = useState(
    `hi ${memberName}, just a friendly reminder that you owe me $${amount.toFixed(2)}. thanks!`,
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      onOpenChange(false)

      toast({
        title: "reminder sent",
        description: `a reminder has been sent to ${memberName}`,
        duration: 3000,
      })
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader
          title="send reminder"
          description={`send a friendly reminder to ${memberName} about their balance of $${amount.toFixed(2)}`}
        />
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message">message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "sending..." : "send reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
