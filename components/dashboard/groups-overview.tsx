"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Plus, Search, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"

export function GroupsOverview() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Function to format date in a more readable way
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Mock data for groups
  const groups = [
    {
      id: "1",
      name: "roommates",
      description: "monthly apartment expenses",
      members: 3,
      balance: -45.75,
      lastActivity: "2 days ago",
      rawDate: "2023-04-10",
    },
    {
      id: "2",
      name: "trip to barcelona",
      description: "vacation expenses",
      members: 4,
      balance: -78.25,
      lastActivity: "5 days ago",
      rawDate: "2023-04-07",
    },
    {
      id: "3",
      name: "office lunch",
      description: "weekly team lunches",
      members: 5,
      balance: 32.5,
      lastActivity: "yesterday",
      rawDate: "2023-04-11",
    },
    {
      id: "4",
      name: "game night",
      description: "monthly game night expenses",
      members: 6,
      balance: 0,
      lastActivity: "1 week ago",
      rawDate: "2023-04-05",
    },
  ]

  const filteredGroups = searchQuery
    ? groups.filter(
        (group) =>
          group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          group.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : groups

  const handleDeleteGroup = (id: string) => {
    setGroupToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteGroup = () => {
    // In a real app, this would call an API to delete the group
    console.log(`Deleting group ${groupToDelete}`)
    setDeleteDialogOpen(false)
    setGroupToDelete(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium md:text-2xl">groups</h1>
          <p className="text-sm text-muted-foreground">manage your expense sharing groups</p>
        </div>
        <Button size="sm" className="mt-2 md:mt-0" asChild>
          <Link href="/dashboard/groups/new">
            <Plus className="mr-1 h-4 w-4" />
            new group
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="search groups..."
          className="pl-9 h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          <p>no groups found matching your search</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                      <span className="sr-only">delete group</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center">
                      <Users className="mr-1 h-3 w-3 text-muted-foreground" />
                      <span>{group.members}</span>
                    </div>
                    <span className="text-muted-foreground">{formatDate(group.rawDate)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">your balance</p>
                      <p
                        className={`text-sm ${
                          group.balance < 0 ? "text-red-600" : group.balance > 0 ? "text-green-600" : ""
                        }`}
                      >
                        {group.balance === 0
                          ? "settled up"
                          : `${group.balance > 0 ? "+$" : "-$"}${Math.abs(group.balance).toFixed(2)}`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/dashboard/groups/${group.id}`}>
                        view
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteGroup}
        title="delete group"
        description="are you sure you want to delete this group? all expenses and settlements in this group will be permanently deleted. this action cannot be undone."
      />
    </div>
  )
}
