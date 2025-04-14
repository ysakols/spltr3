"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DashboardSidebar } from "./dashboard-sidebar"
import { ProfileButton } from "./profile-button"
import { Logo } from "../logo"

export function DashboardHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 h-12 w-full border-b bg-background">
      <div className="container h-full flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0">
                <Menu className="h-4 w-4" />
                <span className="sr-only">toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <DashboardSidebar className="border-none" />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size="small" asChild />
          </Link>
        </div>
        <ProfileButton />
      </div>
    </header>
  )
}
