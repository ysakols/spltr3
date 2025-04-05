import { create } from 'zustand';

// Enhanced settlement details to include creditor information
interface SettlementDetails {
  fromUserId: number;
  toUserId: number;
  amount: number;
  groupId?: number;
  fromUsername: string;
  toUsername: string;
  isCreditor?: boolean; // Flag to indicate if the current user is receiving money
}

interface ModalData {
  title: string;
  description: string;
  fromUserId: number;
  toUserId: number;
  amount: number;
  groupId?: number;
  isCreditor?: boolean;
  fromUserName?: string;
  toUserName?: string;
  onConfirm?: () => void;
}

interface SettlementModalStore {
  isOpen: boolean;
  settlementDetails: SettlementDetails | null;
  data: ModalData | null;
  setSettlementDetails: (details: SettlementDetails) => void;
  clearSettlementDetails: () => void;
  openModal: (data: ModalData) => void;
  closeModal: () => void;
  // Function to simplify opening a settlement modal with minimal details
  openSettlementModal: (details: {
    fromUserId: number;
    toUserId: number;
    amount: number;
    groupId?: number;
    isCreditor?: boolean;
  }) => void;
}

export const useSettlementModal = create<SettlementModalStore>((set) => ({
  isOpen: false,
  settlementDetails: null,
  data: null,
  
  // Original methods for backward compatibility
  setSettlementDetails: (details: SettlementDetails) => 
    set({ isOpen: true, settlementDetails: details }),
  clearSettlementDetails: () => 
    set({ isOpen: false, settlementDetails: null }),
  
  // New methods for the enhanced modal
  openModal: (data: ModalData) => 
    set({ isOpen: true, data }),
  closeModal: () => 
    set({ isOpen: false, data: null }),
    
  // Simplified helper method for opening a settlement modal with minimal info
  openSettlementModal: (details) => {
    const title = details.isCreditor 
      ? 'Mark Payment as Received'
      : 'Settle Up';
      
    const description = details.isCreditor
      ? 'Confirm that you received payment from this user'
      : 'Record payment to settle your debt';
      
    set({ 
      isOpen: true, 
      data: {
        title,
        description,
        fromUserId: details.fromUserId,
        toUserId: details.toUserId,
        amount: details.amount,
        groupId: details.groupId,
        isCreditor: details.isCreditor
      } 
    });
  }
}));