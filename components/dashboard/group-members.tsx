"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Crown } from "lucide-react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { useToast } from "@/hooks/use-toast"

interface GroupMembersProps {
  groupId: string
}

export function GroupMembers({ groupId }: GroupMembersProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<any>(null)
  const { toast } = useToast()

  // Mock data for members
  const members = [
    {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      isAdmin: true,
      joinDate: "jan 15, 2023",
    },
    {
      id: "2",
      firstName: "Alex",
      lastName: "Smith",
      email: "alex.smith@example.com",
      isAdmin: false,
      joinDate: "jan 15, 2023",
    },
    {
      id: "3",
      firstName: "Jamie",
      lastName: "Johnson",
      email: "jamie.johnson@example.com",
      isAdmin: false,
      joinDate: "jan 16, 2023",
    },
    {
      id: "4",
      firstName: "Sam",
      lastName: "Taylor",
      email: "sam.taylor@example.com",
      isAdmin: false,
      joinDate: "jan 17, 2023",
    },
  ]

  const handleMakeAdmin = (member: any) => {
    // In a real app, this would call an API to make the member an admin
    console.log(`Making ${member.firstName} an admin`)

    toast({
      title: "admin role granted",
      description: `${member.firstName} is now an admin of this group`,
      duration: 3000,
    })
  }

  const handleRemoveMember = (member: any) => {
    setMemberToRemove(member)
    setDeleteDialogOpen(true)
  }

  const confirmRemoveMember = () => {
    // In a real app, this would call an API to remove the member
    console.log(`Removing ${memberToRemove.firstName} from the group`)
    setDeleteDialogOpen(false)

    toast({
      title: "member removed",
      description: `${memberToRemove.firstName} has been removed from the group`,
      duration: 3000,
    })
  }

  return (
    <div className="divide-y">
      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground font-medium">
              {member.firstName.charAt(0).toLowerCase()}
              {member.lastName.charAt(0).toLowerCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="truncate text-sm font-medium">
                  {member.firstName} {member.lastName.charAt(0)}
                </p>
                {member.isAdmin && (
                  <div className="flex items-center text-yellow-500" title="Group Admin">
                    <Crown className="h-3 w-3" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>
          </div>
          {!member.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                  <span className="sr-only">more</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem className="text-xs" onSelect={() => handleMakeAdmin(member)}>
                  make admin
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs text-red-600" onSelect={() => handleRemoveMember(member)}>
                  remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmRemoveMember}
        title="remove member"
        description={`Are you sure you want to remove ${memberToRemove?.firstName} from this group? They will no longer have access to the group's expenses.`}
      />
    </div>
  )
}
