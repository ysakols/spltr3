import { create } from 'zustand';

interface SettlementDetails {
  fromUserId: number;
  toUserId: number;
  amount: number;
  groupId?: number;
  fromUsername: string;
  toUsername: string;
}

interface SettlementModalStore {
  isOpen: boolean;
  settlementDetails: SettlementDetails | null;
  setSettlementDetails: (details: SettlementDetails) => void;
  clearSettlementDetails: () => void;
}

export const useSettlementModal = create<SettlementModalStore>((set) => ({
  isOpen: false,
  settlementDetails: null,
  setSettlementDetails: (details: SettlementDetails) => 
    set({ isOpen: true, settlementDetails: details }),
  clearSettlementDetails: () => set({ isOpen: false, settlementDetails: null }),
}));