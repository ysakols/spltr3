"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useModal } from "@/contexts/modal-context"

export default function CreateGroupPage() {
  const router = useRouter()
  const { openGroupModal, isGroupModalOpen } = useModal()

  useEffect(() => {
    // Open the group modal when this page is loaded
    openGroupModal()
  }, []) // Empty dependency array to run only once

  // Set up a separate effect to handle navigation when modal closes
  useEffect(() => {
    // If modal was open and is now closed, redirect
    if (!isGroupModalOpen) {
      router.push("/dashboard/groups")
    }
  }, [isGroupModalOpen, router])

  return null // This page doesn't render anything, it just triggers the modal
}
