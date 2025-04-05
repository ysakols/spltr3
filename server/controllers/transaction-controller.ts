import { Request, Response } from "express";
import { storage } from "../storage";
import { insertTransactionSchema } from "@shared/schema";
import { sanitizeUser, isUserInGroup } from "../utils/user-utils";

/**
 * Controller for transaction-related operations
 */
export const TransactionController = {
  /**
   * Get transactions for a specific group
   */
  getGroupTransactions: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }

      const transactions = await storage.getGroupTransactions(Number(groupId));
      res.json(transactions);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get a single transaction by ID
   */
  getTransactionById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const transaction = await storage.getTransaction(Number(id));
      
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if user is authorized to view this transaction
      if (transaction.groupId) {
        const isMember = await isUserInGroup(userId, transaction.groupId);
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to access this transaction' });
        }
      } else if (transaction.fromUserId !== userId && transaction.toUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to access this transaction' });
      }
      
      res.json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Create a new transaction
   */
  createTransaction: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Validate request body
      const transactionData = insertTransactionSchema.parse(req.body);
      
      // If transaction is tied to a group, ensure user is a member
      if (transactionData.groupId) {
        const isMember = await isUserInGroup(userId, transactionData.groupId);
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to create transactions in this group' });
        }
      }
      
      // Create transaction
      const transaction = await storage.createTransaction({
        ...transactionData,
        createdByUserId: userId
      });
      
      if (!transaction) {
        return res.status(500).json({ message: 'Failed to create transaction' });
      }
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Update a transaction
   */
  updateTransaction: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get existing transaction
      const existingTransaction = await storage.getTransaction(Number(id));
      
      if (!existingTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if user created this transaction or is the payer
      if (existingTransaction.createdByUserId !== userId && existingTransaction.paidByUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this transaction' });
      }
      
      // Update transaction
      const updatedTransaction = await storage.updateTransaction(Number(id), req.body);
      
      if (!updatedTransaction) {
        return res.status(500).json({ message: 'Failed to update transaction' });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Delete a transaction
   */
  deleteTransaction: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get existing transaction
      const existingTransaction = await storage.getTransaction(Number(id));
      
      if (!existingTransaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if user created this transaction
      if (existingTransaction.createdByUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this transaction' });
      }
      
      // Delete transaction
      await storage.deleteTransaction(Number(id));
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get transactions for a specific user
   */
  getUserTransactions: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Only allow users to view their own transactions
      if (Number(userId) !== currentUserId) {
        return res.status(403).json({ message: 'Not authorized to view other users transactions' });
      }
      
      const transactions = await storage.getUserTransactions(Number(userId));
      res.json(transactions);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Create a settlement between users
   */
  createSettlement: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { fromUserId, toUserId, amount, groupId, paymentMethod, notes } = req.body;
      
      // Ensure current user is involved in the settlement
      if (Number(fromUserId) !== userId) {
        return res.status(403).json({ message: 'Only the paying user can create a settlement' });
      }
      
      // If for a group, check membership
      if (groupId) {
        const isFromUserInGroup = await isUserInGroup(fromUserId, groupId);
        const isToUserInGroup = await isUserInGroup(toUserId, groupId);
        
        if (!isFromUserInGroup || !isToUserInGroup) {
          return res.status(403).json({ message: 'Both users must be members of the group' });
        }
      }
      
      // Create settlement
      const settlement = await storage.createSettlement({
        fromUserId,
        toUserId,
        amount: amount.toString(),
        groupId: groupId || null,
        paymentMethod,
        notes: notes || null,
        status: 'pending',
        completedAt: null,
        transactionReference: null
      });
      
      if (!settlement) {
        return res.status(500).json({ message: 'Failed to create settlement' });
      }
      
      res.status(201).json(settlement);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get user's settlements
   */
  getUserSettlements: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Only allow users to view their own settlements
      if (Number(userId) !== currentUserId) {
        return res.status(403).json({ message: 'Not authorized to view other users settlements' });
      }
      
      const settlements = await storage.getUserSettlements(Number(userId));
      res.json(settlements);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get settlements for a group
   */
  getGroupSettlements: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }
      
      const settlements = await storage.getGroupSettlements(Number(groupId));
      res.json(settlements);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Update a settlement
   */
  updateSettlement: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get existing settlement
      const existingSettlement = await storage.getSettlement(Number(id));
      
      if (!existingSettlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Only allow recipient to update status
      if (existingSettlement.toUserId !== userId) {
        return res.status(403).json({ message: 'Only the recipient can update a settlement' });
      }
      
      // Update settlement
      const updatedSettlement = await storage.updateSettlement(Number(id), {
        ...req.body,
        completedAt: req.body.status === 'completed' ? new Date() : existingSettlement.completedAt
      });
      
      if (!updatedSettlement) {
        return res.status(500).json({ message: 'Failed to update settlement' });
      }
      
      res.json(updatedSettlement);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Delete a settlement
   */
  deleteSettlement: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get existing settlement
      const existingSettlement = await storage.getSettlement(Number(id));
      
      if (!existingSettlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Only allow the creator to delete
      if (existingSettlement.fromUserId !== userId) {
        return res.status(403).json({ message: 'Only the payer can delete a settlement' });
      }
      
      // Cannot delete completed settlements
      if (existingSettlement.status === 'completed') {
        return res.status(400).json({ message: 'Cannot delete a completed settlement' });
      }
      
      // Delete settlement
      await storage.deleteSettlement(Number(id));
      
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }
};