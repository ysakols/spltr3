"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DialogHeader as CustomDialogHeader } from "./dialog-header"
import { useToast } from "@/hooks/use-toast"

interface EditGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupName: string
  groupDescription: string
}

export function EditGroupDialog({ open, onOpenChange, groupId, groupName, groupDescription }: EditGroupDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState(groupName)
  const [description, setDescription] = useState(groupDescription)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // In a real app, this would call an API to update the group
      console.log(`Updating group ${groupId} with name: ${name}, description: ${description}`)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Group updated",
        description: "Your group has been updated successfully.",
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <CustomDialogHeader>
          <DialogHeader>
            <DialogTitle>edit group</DialogTitle>
            <DialogDescription>update your group details</DialogDescription>
          </DialogHeader>
        </CustomDialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">group name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., roommates, trip to barcelona"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., monthly apartment expenses"
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "saving..." : "save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
