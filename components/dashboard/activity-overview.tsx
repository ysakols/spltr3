import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { RecentActivity } from "./recent-activity"

// Replace the filter button with a simple date range selector and remove tabs for a simpler experience
export function ActivityOverview() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium md:text-2xl">activity</h1>
        <p className="text-sm text-muted-foreground">track all your expenses and settlements</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="search activity..." className="pl-9 h-9" />
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
          <CardTitle className="text-base">all activity</CardTitle>
          <CardDescription>a complete history of your expenses and settlements</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <RecentActivity extended={true} />
        </CardContent>
      </Card>
    </div>
  )
}
