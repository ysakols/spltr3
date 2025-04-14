import type React from "react"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { EnhancedMobileNav } from "@/components/dashboard/enhanced-mobile-nav"
import { ModalProvider } from "@/contexts/modal-context"
import { GlobalModals } from "@/components/dashboard/global-modals"
import { CurrencyProvider } from "@/contexts/currency-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <CurrencyProvider>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardSidebar className="hidden lg:block h-full sticky top-14" />
            <main className="flex-1 p-4 md:p-6 pb-32 lg:pb-6 overflow-auto">{children}</main>
          </div>
          <EnhancedMobileNav />
          <GlobalModals />
        </div>
      </CurrencyProvider>
    </ModalProvider>
  )
}
