"use client"

import { ExpenseModal } from "./expense-modal"
import { SettleUpModal } from "./settle-up-modal"
import { GroupModal } from "./group-modal"

export function GlobalModals() {
  return (
    <>
      <ExpenseModal />
      <SettleUpModal />
      <GroupModal />
    </>
  )
}
