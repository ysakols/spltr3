"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useModal } from "@/contexts/modal-context"

export default function NewExpensePage() {
  const router = useRouter()
  const { openExpenseModal, isExpenseModalOpen } = useModal()

  // Open the expense modal when the page loads
  useEffect(() => {
    // Open the modal with empty data
    openExpenseModal({})
  }, [openExpenseModal])

  // Listen for changes to the modal state and redirect when closed
  useEffect(() => {
    if (!isExpenseModalOpen) {
      // Small delay to ensure the modal has fully closed
      const redirectTimer = setTimeout(() => {
        router.push("/dashboard/expenses")
      }, 100)

      return () => clearTimeout(redirectTimer)
    }
  }, [isExpenseModalOpen, router])

  // Return null as the modal will be rendered by the GlobalModals component
  return null
}
