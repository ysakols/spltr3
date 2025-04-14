"use client"

import type React from "react"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Receipt, CreditCard, User, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { motion } from "framer-motion"
import { LogoIcon } from "@/components/logo-icon"
import { useModal } from "@/contexts/modal-context"

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  exact: boolean
}

export function EnhancedMobileNav() {
  const pathname = usePathname()
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false)
  const { openExpenseModal, openGroupModal, openSettleUpModal } = useModal()

  const navItems: NavItem[] = [
    {
      name: "overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
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
    {
      name: "profile",
      href: "/dashboard/profile",
      icon: User,
      exact: false,
    },
  ]

  const handleAddExpense = () => {
    setIsQuickActionOpen(false)
    openExpenseModal()
  }

  const handleCreateGroup = () => {
    setIsQuickActionOpen(false)
    openGroupModal()
  }

  const handleSettleUp = () => {
    setIsQuickActionOpen(false)
    openSettleUpModal()
  }

  const quickActions = [
    {
      name: "Add Expense",
      action: handleAddExpense,
      icon: Receipt,
    },
    {
      name: "Create Group",
      action: handleCreateGroup,
      icon: Users,
    },
    {
      name: "Settle Up",
      action: handleSettleUp,
      icon: CreditCard,
    },
  ]

  return (
    <>
      <nav className="footer-fixed lg:hidden" aria-label="Mobile navigation">
        <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn("nav-item", isActive ? "nav-item-active" : "nav-item-inactive")}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute top-0 h-0.5 w-10 bg-primary rounded-b-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="fixed right-4 bottom-20 lg:hidden z-50">
        <Sheet open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-elevated" aria-label="Quick actions">
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-xl px-0">
            <div className="px-4 py-2">
              <h3 className="text-lg font-medium">
                <LogoIcon size={24} /> quick actions
              </h3>
              <p className="text-sm text-muted-foreground">what would you like to do?</p>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {quickActions.map((action) => (
                <div
                  key={action.name}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={action.action}
                >
                  <action.icon className="h-6 w-6 mb-2 text-primary" />
                  <span className="text-xs text-center">{action.name}</span>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
