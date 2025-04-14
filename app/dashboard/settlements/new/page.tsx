"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useModal } from "@/contexts/modal-context"

export default function NewSettlementPage() {
  const router = useRouter()
  const { openSettleUpModal, isSettleUpModalOpen } = useModal()

  // Open the modal once when the page loads
  useEffect(() => {
    // Only open if not already open
    if (!isSettleUpModalOpen) {
      openSettleUpModal({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally only run once on mount

  // Redirect when modal closes
  useEffect(() => {
    if (!isSettleUpModalOpen) {
      // Add a small delay to ensure the modal has fully closed
      const timer = setTimeout(() => {
        router.push("/dashboard/settlements")
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isSettleUpModalOpen, router])

  // Return an empty div as the modal will be rendered by the GlobalModals component
  return null
}
