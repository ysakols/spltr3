"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import Link from "next/link"
import { GroupList } from "./group-list"
import { RecentActivity } from "./recent-activity"
import { BalanceSummary } from "./balance-summary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { UnifiedExpenseDialog } from "./unified-expense-dialog"

export function EnhancedDashboardOverview() {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)

  return (
    <div className="space-y-6 pb-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-medium md:text-3xl">dashboard</h1>
          <p className="text-sm text-muted-foreground">welcome back! here's an overview of your shared expenses.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/settlements/new">Settle Up</Link>
          </Button>
          <Button size="sm" onClick={() => setIsExpenseDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </header>

      <section aria-labelledby="summary-heading" className="grid gap-4 md:grid-cols-3">
        <h2 id="summary-heading" className="sr-only">
          Financial Summary
        </h2>

        <Card className="border">
          <CardContent className="p-6">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">Total Balance</span>
              <span className="text-2xl font-mono font-medium text-expense">-$142.50</span>
              <div className="flex items-center mt-1">
                <Badge variant="outline" className="text-expense">
                  You owe 3 people
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-6">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">Active Groups</span>
              <span className="text-2xl font-medium">4</span>
              <div className="flex items-center mt-1">
                <Badge variant="outline">12 members</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-6">
            <div className="flex flex-col">
              <span className="text-xs uppercase text-muted-foreground font-medium mb-1">Recent Activity</span>
              <span className="text-2xl font-medium">23</span>
              <div className="flex items-center mt-1">
                <Badge variant="outline">Last 30 days</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="tabs-heading" className="space-y-4">
        <h2 id="tabs-heading" className="sr-only">
          Dashboard Tabs
        </h2>

        <Tabs defaultValue="balances" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="balances">Balances</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="balances" className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base">Balance Summary</CardTitle>
                <CardDescription>Your current balances with other users</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <BalanceSummary />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Your recent expenses and settlements</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <RecentActivity />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <section aria-labelledby="groups-heading">
        <Card>
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle id="groups-heading" className="text-base">
                  Your Groups
                </CardTitle>
                <CardDescription>Manage your expense sharing groups</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/groups">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <GroupList />
          </CardContent>
        </Card>
      </section>

      <UnifiedExpenseDialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen} />
    </div>
  )
}
