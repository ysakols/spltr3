"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useModal } from "@/contexts/modal-context"
import { DialogHeader } from "./dialog-header"

export function GroupModal() {
  const { isGroupModalOpen, groupModalData, closeModal } = useModal()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const isEditing = !!groupModalData.groupId

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate group creation/editing
    setTimeout(() => {
      setIsLoading(false)
      closeModal("group")

      toast({
        title: isEditing ? "Group updated" : "Group created",
        description: isEditing
          ? "Your expense group has been updated successfully."
          : "Your new expense group has been created successfully.",
      })

      if (!isEditing) {
        router.push("/dashboard/groups/1")
      }
    }, 1500)
  }

  return (
    <Dialog open={isGroupModalOpen} onOpenChange={(open) => !open && closeModal("group")}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader
          title={isEditing ? "edit group" : "create a new group"}
          description={
            isEditing
              ? "update your expense-sharing group details"
              : "set up a new expense-sharing group with your friends, roommates, or colleagues"
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">group name</Label>
              <Input id="name" placeholder="e.g., roommates, trip to paris, office lunch" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">description (optional)</Label>
              <Textarea id="description" placeholder="what is this group for?" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">default currency</Label>
              <Select defaultValue="USD">
                <SelectTrigger>
                  <SelectValue placeholder="select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">category (optional)</Label>
              <Select defaultValue="other">
                <SelectTrigger>
                  <SelectValue placeholder="select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">home</SelectItem>
                  <SelectItem value="trip">trip</SelectItem>
                  <SelectItem value="couple">couple</SelectItem>
                  <SelectItem value="event">event</SelectItem>
                  <SelectItem value="project">project</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => closeModal("group")}>
              cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditing ? "updating..." : "creating...") : isEditing ? "update group" : "create group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
