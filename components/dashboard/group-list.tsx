import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, Users } from "lucide-react"
import Link from "next/link"

export function GroupList() {
  const groups = [
    {
      id: "1",
      name: "Roommates",
      description: "Monthly apartment expenses",
      members: 3,
      balance: -45.75,
      lastActivity: "2 days ago",
      lastActivityDate: "2023-04-10",
    },
    {
      id: "2",
      name: "Trip to Barcelona",
      description: "Vacation expenses",
      members: 4,
      balance: -78.25,
      lastActivity: "5 days ago",
      lastActivityDate: "2023-04-07",
    },
    {
      id: "3",
      name: "Office Lunch",
      description: "Weekly team lunches",
      members: 5,
      balance: 32.5,
      lastActivity: "Yesterday",
      lastActivityDate: "2023-04-11",
    },
    {
      id: "4",
      name: "Game Night",
      description: "Monthly game night expenses",
      members: 6,
      balance: 0,
      lastActivity: "1 week ago",
      lastActivityDate: "2023-04-05",
    },
  ]

  // Function to format date in a more readable way
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="flex flex-col space-y-3">
      {groups.map((group) => (
        <Card key={group.id} className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-base">{group.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{group.description}</p>

                <div className="flex items-center text-xs mt-2 space-x-3">
                  <div className="flex items-center">
                    <Users className="mr-1 h-3 w-3 text-muted-foreground" />
                    <span>{group.members}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-1 h-2.5 w-2.5" />
                    <span className="text-[10px]">{formatDate(group.lastActivityDate)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end ml-4 min-w-[120px]">
                <p className="text-xs text-muted-foreground">Your balance</p>
                <p
                  className={`text-sm font-mono font-medium ${
                    group.balance < 0 ? "text-red-600" : group.balance > 0 ? "text-green-600" : ""
                  }`}
                >
                  {group.balance === 0
                    ? "Settled up"
                    : `${group.balance > 0 ? "+$" : "-$"}${Math.abs(group.balance).toFixed(2)}`}
                </p>
                <Button variant="outline" size="sm" className="h-7 text-xs mt-2" asChild>
                  <Link href={`/dashboard/groups/${group.id}`}>
                    View
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
