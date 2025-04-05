import { Express, Request, Response } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { storage } from "../storage";
import { insertTransactionSchema, insertSettlementSchema } from "@shared/schema";
import { 
  verifyTransactionConsistency, 
  reconcileTransactionData, 
  findInconsistentTransactions 
} from '../transactionVerification';

/**
 * Register transaction-related routes
 * @param app Express application
 */
export function registerTransactionRoutes(app: Express): void {
  // Get group transactions
  app.get('/api/groups/:groupId/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view transactions for this group' });
      }
      
      const transactions = await storage.getTransactionsByGroupId(groupId);
      return res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving group transactions' });
    }
  });

  // Get transaction by ID
  app.get('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // If transaction has a group, check if user is a member
      if (transaction.groupId) {
        const isMember = await storage.isUserInGroup(transaction.groupId, userId);
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to view this transaction' });
        }
      } else {
        // For non-group transactions, check if user is involved
        if (transaction.fromUserId !== userId && transaction.toUserId !== userId) {
          return res.status(403).json({ message: 'Not authorized to view this transaction' });
        }
      }
      
      return res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving transaction' });
    }
  });

  // Create transaction
  app.post('/api/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Validate the transaction data
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      // If there's a group, check if user is a member
      if (transactionData.groupId) {
        const isMember = await storage.isUserInGroup(transactionData.groupId, userId);
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to create transactions for this group' });
        }
      }
      
      // Create the transaction
      const newTransaction = await storage.createTransaction(transactionData);
      if (!newTransaction) {
        return res.status(500).json({ message: 'Failed to create transaction' });
      }
      
      return res.status(201).json(newTransaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Update transaction
  app.patch('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check authorization
      if (transaction.createdBy !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this transaction' });
      }
      
      // Update the transaction
      const updatedTransaction = await storage.updateTransaction(transactionId, req.body);
      if (!updatedTransaction) {
        return res.status(500).json({ message: 'Failed to update transaction' });
      }
      
      return res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Delete transaction
  app.delete('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check authorization
      if (transaction.createdBy !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this transaction' });
      }
      
      // Soft delete the transaction
      await storage.deleteTransaction(transactionId);
      
      return res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting transaction' });
    }
  });

  // Get user transactions
  app.get('/api/users/:userId/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Users should only see their own transactions
      if (targetUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view transactions for this user' });
      }
      
      const transactions = await storage.getTransactionsByUserId(userId);
      return res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user transactions' });
    }
  });

  // Create settlement
  app.post('/api/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Validate the settlement data
      const settlementData = insertSettlementSchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      // Check if the user is the one who owes
      if (settlementData.fromUserId !== userId) {
        return res.status(403).json({ message: 'You can only create settlements that you are paying' });
      }
      
      // Check that the settlement amount is valid
      if (settlementData.amount <= 0) {
        return res.status(400).json({ message: 'Settlement amount must be positive' });
      }
      
      // If there's a group, check if both users are members
      if (settlementData.groupId) {
        const fromUserInGroup = await storage.isUserInGroup(settlementData.groupId, settlementData.fromUserId);
        const toUserInGroup = await storage.isUserInGroup(settlementData.groupId, settlementData.toUserId);
        
        if (!fromUserInGroup || !toUserInGroup) {
          return res.status(403).json({ message: 'Both users must be members of the group' });
        }
      }
      
      // Create the settlement
      const newSettlement = await storage.createSettlement(settlementData);
      if (!newSettlement) {
        return res.status(500).json({ message: 'Failed to create settlement' });
      }
      
      return res.status(201).json(newSettlement);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Get settlement by ID
  app.get('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settlementId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the settlement
      const settlement = await storage.getSettlement(settlementId);
      if (!settlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check if user is involved in the settlement
      if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this settlement' });
      }
      
      return res.json(settlement);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving settlement' });
    }
  });

  // Get user settlements
  app.get('/api/users/:userId/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Users should only see their own settlements
      if (targetUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view settlements for this user' });
      }
      
      const settlements = await storage.getSettlementsByUserId(userId);
      return res.json(settlements);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user settlements' });
    }
  });

  // Get group settlements
  app.get('/api/groups/:groupId/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view settlements for this group' });
      }
      
      const settlements = await storage.getSettlementsByGroupId(groupId);
      return res.json(settlements);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving group settlements' });
    }
  });

  // Update settlement
  app.put('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settlementId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the settlement
      const settlement = await storage.getSettlement(settlementId);
      if (!settlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check authorization
      if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this settlement' });
      }
      
      // Update the settlement
      const updatedSettlement = await storage.updateSettlement(settlementId, req.body);
      if (!updatedSettlement) {
        return res.status(500).json({ message: 'Failed to update settlement' });
      }
      
      return res.json(updatedSettlement);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Delete settlement
  app.delete('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const settlementId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the settlement
      const settlement = await storage.getSettlement(settlementId);
      if (!settlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check authorization - only the person who created it can delete it
      if (settlement.createdBy !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this settlement' });
      }
      
      // Soft delete the settlement
      await storage.deleteSettlement(settlementId);
      
      return res.json({ message: 'Settlement deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting settlement' });
    }
  });
}