"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type ModalType = "expense" | "settleUp" | "group"

interface ModalContextProps {
  // Modal states
  isExpenseModalOpen: boolean
  isSettleUpModalOpen: boolean
  isGroupModalOpen: boolean

  // Modal data
  expenseModalData: {
    groupId?: string
    groupName?: string
    groupCurrency?: string
  }
  settleUpModalData: {
    groupId?: string
    groupName?: string
    preselectedMember?: any
  }
  groupModalData: {
    groupId?: string // For editing existing group
  }

  // Modal actions
  openExpenseModal: (data?: { groupId?: string; groupName?: string; groupCurrency?: string }) => void
  openSettleUpModal: (data?: { groupId?: string; groupName?: string; preselectedMember?: any }) => void
  openGroupModal: (data?: { groupId?: string }) => void
  closeModal: (type: ModalType) => void
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  // Modal open states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)

  // Modal data states
  const [expenseModalData, setExpenseModalData] = useState<{
    groupId?: string
    groupName?: string
    groupCurrency?: string
  }>({})

  const [settleUpModalData, setSettleUpModalData] = useState<{
    groupId?: string
    groupName?: string
    preselectedMember?: any
  }>({})

  const [groupModalData, setGroupModalData] = useState<{
    groupId?: string
  }>({})

  // Open modal functions
  const openExpenseModal = (data = {}) => {
    setExpenseModalData(data)
    setIsExpenseModalOpen(true)
  }

  const openSettleUpModal = (data = {}) => {
    setSettleUpModalData(data)
    setIsSettleUpModalOpen(true)
  }

  const openGroupModal = (data = {}) => {
    setGroupModalData(data)
    setIsGroupModalOpen(true)
  }

  // Close modal function
  const closeModal = (type: ModalType) => {
    switch (type) {
      case "expense":
        setIsExpenseModalOpen(false)
        break
      case "settleUp":
        setIsSettleUpModalOpen(false)
        break
      case "group":
        setIsGroupModalOpen(false)
        break
    }
  }

  return (
    <ModalContext.Provider
      value={{
        isExpenseModalOpen,
        isSettleUpModalOpen,
        isGroupModalOpen,
        expenseModalData,
        settleUpModalData,
        groupModalData,
        openExpenseModal,
        openSettleUpModal,
        openGroupModal,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider")
  }
  return context
}
