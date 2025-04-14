"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BarChart, Users, Receipt, CreditCard } from "lucide-react"

export function DashboardNav() {
  const pathname = usePathname()

  const navItems = [
    {
      name: "overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "activity",
      href: "/dashboard/activity",
      icon: BarChart,
      exact: false,
    },
    {
      name: "groups",
      href: "/dashboard/groups",
      icon: Users,
      exact: false,
    },
    {
      name: "expenses",
      href: "/dashboard/expenses",
      icon: Receipt,
      exact: false,
    },
    {
      name: "settle",
      href: "/dashboard/settlements",
      icon: CreditCard,
      exact: false,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t bg-background">
      <div className="flex h-14 items-center justify-around">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] mt-1">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
