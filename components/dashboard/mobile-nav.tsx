import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Receipt, CreditCard, User } from "lucide-react"
import Link from "next/link"

interface MobileNavProps {
  className?: string
}

export function MobileNav({ className }: MobileNavProps) {
  return (
    <div className={cn("fixed bottom-0 left-0 z-50 w-full border-t bg-background", className)}>
      <div className="flex h-14 items-center justify-around">
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex flex-col items-center justify-center rounded-none"
          asChild
        >
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] mt-1">overview</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex flex-col items-center justify-center rounded-none"
          asChild
        >
          <Link href="/dashboard/groups">
            <Users className="h-4 w-4" />
            <span className="text-[10px] mt-1">groups</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex flex-col items-center justify-center rounded-none"
          asChild
        >
          <Link href="/dashboard/expenses">
            <Receipt className="h-4 w-4" />
            <span className="text-[10px] mt-1">expenses</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex flex-col items-center justify-center rounded-none"
          asChild
        >
          <Link href="/dashboard/settlements">
            <CreditCard className="h-4 w-4" />
            <span className="text-[10px] mt-1">settle</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-full w-full flex flex-col items-center justify-center rounded-none"
          asChild
        >
          <Link href="/dashboard/profile">
            <User className="h-4 w-4" />
            <span className="text-[10px] mt-1">profile</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
