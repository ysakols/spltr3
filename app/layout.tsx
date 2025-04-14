import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { ModalProvider } from "@/contexts/modal-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spltr3 - Split Expenses with Friends",
  description: "A modern expense splitting app for friends, roommates, and groups",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ModalProvider>
            {children}
            <Toaster />
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'