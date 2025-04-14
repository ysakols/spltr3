import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
import { GroupList } from "./group-list"
import { RecentActivity } from "./recent-activity"
import { BalanceSummary } from "./balance-summary"

export function DashboardOverview() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium md:text-2xl">dashboard</h1>
          <p className="text-sm text-muted-foreground">welcome back! here's an overview of your shared expenses.</p>
        </div>
        <Button asChild size="sm" className="mt-2 md:mt-0">
          <Link href="/dashboard/groups/new">
            <Plus className="mr-1 h-4 w-4" />
            new group
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">total balance</span>
              <span className="text-xl font-mono font-medium text-red-600">-$142.50</span>
              <span className="text-xs text-muted-foreground mt-1">you owe money to 3 people</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">active groups</span>
              <span className="text-xl font-medium">4</span>
              <span className="text-xs text-muted-foreground mt-1">across 12 members</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">recent expenses</span>
              <span className="text-xl font-medium">23</span>
              <span className="text-xs text-muted-foreground mt-1">in the last 30 days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">recent activity</CardTitle>
            <CardDescription>your recent expenses and settlements</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RecentActivity />
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">balance summary</CardTitle>
            <CardDescription>your current balances with other users</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <BalanceSummary />
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="border">
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">your groups</CardTitle>
                <CardDescription>manage your expense sharing groups</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/groups">view all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <GroupList />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
