import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Receipt, CreditCard } from "lucide-react"

interface DashboardSidebarProps {
  className?: string
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  return (
    <aside className={cn("w-56 border-r bg-background h-[calc(100vh-3.5rem)]", className)}>
      <div className="flex h-full flex-col py-4">
        <div className="space-y-3 px-3">
          <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              dashboard
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm" asChild>
            <Link href="/dashboard/groups">
              <Users className="mr-2 h-4 w-4" />
              groups
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm" asChild>
            <Link href="/dashboard/expenses">
              <Receipt className="mr-2 h-4 w-4" />
              expenses
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start h-8 px-2 text-sm" asChild>
            <Link href="/dashboard/settlements">
              <CreditCard className="mr-2 h-4 w-4" />
              settlements
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  )
}
