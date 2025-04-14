import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Search } from "lucide-react"
import { SettlementsList } from "./settlements-list"
import { BalanceSummary } from "./balance-summary"

export function SettlementsOverview() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium md:text-2xl">settlements</h1>
          <p className="text-sm text-muted-foreground">track and manage payments between you and your friends</p>
        </div>
        <Button size="sm" className="mt-2 md:mt-0">
          <CreditCard className="mr-1 h-4 w-4" />
          record a payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">balances</CardTitle>
            <CardDescription>your current balances with other users</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <BalanceSummary />
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">settlement summary</CardTitle>
            <CardDescription>overview of your payments and debts</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">total owed to you</p>
                <p className="text-xl text-green-600">+$110.75</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">total you owe</p>
                <p className="text-xl text-red-600">-$253.25</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">net balance</p>
                <p className="text-xl text-red-600">-$142.50</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">settlements this month</p>
                <p className="text-xl">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="search settlements..." className="pl-9 h-9" />
        </div>
        <div>
          <Select defaultValue="all-time">
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">all time</SelectItem>
              <SelectItem value="this-month">this month</SelectItem>
              <SelectItem value="last-month">last month</SelectItem>
              <SelectItem value="this-year">this year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">recent settlements</CardTitle>
          <CardDescription>history of payments between you and others</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SettlementsList />
        </CardContent>
      </Card>
    </div>
  )
}
