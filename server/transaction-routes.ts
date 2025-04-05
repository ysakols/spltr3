import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './auth';
import { 
  insertTransactionSchema, 
  TransactionType, 
  TransactionStatus, 
  SplitType,
  PaymentMethod,
  User
} from '../shared/schema';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';

/**
 * Register routes for the unified transaction system.
 * These will eventually replace the separate expense and settlement routes.
 */
export function registerTransactionRoutes(app: Express): void {
  // Get all transactions for a group
  app.get('/api/groups/:groupId/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      // Ensure the user is a member of the group
      const user = req.user as User;
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.id === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view these transactions' });
      }
      
      // Include deleted parameter as a query parameter (optional)
      const includeDeleted = req.query.includeDeleted === 'true';
      
      const transactions = await storage.getGroupTransactions(groupId, includeDeleted);
      
      // Enhance transactions with user information
      const enhancedTransactions = await Promise.all(transactions.map(async (transaction) => {
        // Get the user who paid for the transaction
        const paidByUser = transaction.paidByUserId ? await storage.getUser(transaction.paidByUserId) : null;
        
        // Get the user who created the transaction
        const createdByUser = transaction.createdByUserId ? await storage.getUser(transaction.createdByUserId) : null;
        
        // Get the recipient user for settlements
        const toUser = transaction.toUserId ? await storage.getUser(transaction.toUserId) : null;
        
        // Create user objects with only the necessary fields for the UI
        const minimalPaidByUser = paidByUser ? {
          id: paidByUser.id,
          username: paidByUser.username,
          name: paidByUser.name,
          email: paidByUser.email,
          avatar_url: paidByUser.avatar_url
        } : null;
        
        const minimalCreatedByUser = createdByUser ? {
          id: createdByUser.id,
          username: createdByUser.username,
          name: createdByUser.name,
          email: createdByUser.email,
          avatar_url: createdByUser.avatar_url
        } : null;
        
        const minimalToUser = toUser ? {
          id: toUser.id,
          username: toUser.username,
          name: toUser.name,
          email: toUser.email,
          avatar_url: toUser.avatar_url
        } : null;
        
        return {
          ...transaction,
          paidByUser: minimalPaidByUser,
          createdByUser: minimalCreatedByUser,
          toUser: minimalToUser
        };
      }));
      
      res.json(enhancedTransactions);
    } catch (error) {
      console.error('Error getting group transactions:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get a specific transaction
  app.get('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if the user is authorized to view this transaction
      const user = req.user as User;
      
      if (transaction.groupId) {
        // Group-specific transaction - check if user is a member
        const members = await storage.getGroupMembers(transaction.groupId);
        const isMember = members.some(member => member.id === user.id);
        
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to view this transaction' });
        }
      } else {
        // Global transaction - check if user is involved
        if (transaction.paidByUserId !== user.id && transaction.toUserId !== user.id) {
          return res.status(403).json({ message: 'Not authorized to view this transaction' });
        }
      }
      
      // Get related user info
      const paidByUser = transaction.paidByUserId ? await storage.getUser(transaction.paidByUserId) : null;
      const createdByUser = transaction.createdByUserId ? await storage.getUser(transaction.createdByUserId) : null;
      const toUser = transaction.toUserId ? await storage.getUser(transaction.toUserId) : null;
      
      // Create user objects with only the necessary fields
      const minimalPaidByUser = paidByUser ? {
        id: paidByUser.id,
        username: paidByUser.username,
        name: paidByUser.name,
        email: paidByUser.email,
        avatar_url: paidByUser.avatar_url
      } : null;
      
      const minimalCreatedByUser = createdByUser ? {
        id: createdByUser.id,
        username: createdByUser.username,
        name: createdByUser.name,
        email: createdByUser.email,
        avatar_url: createdByUser.avatar_url
      } : null;
      
      const minimalToUser = toUser ? {
        id: toUser.id,
        username: toUser.username,
        name: toUser.name,
        email: toUser.email,
        avatar_url: toUser.avatar_url
      } : null;
      
      const enhancedTransaction = {
        ...transaction,
        paidByUser: minimalPaidByUser,
        createdByUser: minimalCreatedByUser,
        toUser: minimalToUser
      };
      
      res.json(enhancedTransaction);
    } catch (error) {
      console.error('Error getting transaction:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Create an expense transaction
  app.post('/api/groups/:groupId/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Get group members to use as default split recipients
      const members = await storage.getGroupMembers(groupId);
      const memberIds = members.map(member => member.id);
      
      // Add current user ID as the createdByUserId and set the type as expense
      const currentUserId = (req.user as User).id;
      const transactionData = {
        ...req.body,
        type: TransactionType.EXPENSE,
        groupId,
        createdByUserId: currentUserId,
        splitWithUserIds: req.body.splitWithUserIds || memberIds
      };
      
      // Validate the data
      const validatedData = insertTransactionSchema.safeParse(transactionData);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Create the transaction
      const transaction = await storage.createTransaction(validatedData.data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating expense transaction:', error);
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // Create a settlement transaction
  app.post('/api/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Validate the settlement data
      const settlementSchema = z.object({
        fromUserId: z.number(),
        toUserId: z.number(),
        amount: z.string(),
        groupId: z.number().optional(),
        paymentMethod: z.nativeEnum(PaymentMethod),
        notes: z.string().optional().nullable()
      });
      
      const validatedSettlement = settlementSchema.safeParse(req.body);
      if (!validatedSettlement.success) {
        const error = fromZodError(validatedSettlement.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Allow either:
      // 1. The debtor to create a settlement they're paying for (fromUserId is their ID)
      // 2. The creditor to create a settlement for a received payment (toUserId is their ID)
      const user = req.user as User;
      
      if (validatedSettlement.data.fromUserId !== user.id && validatedSettlement.data.toUserId !== user.id) {
        return res.status(403).json({ message: 'You can only create settlements where you are either the payer or recipient' });
      }
      
      // If this is a group-specific settlement, verify the user is a member
      if (validatedSettlement.data.groupId) {
        const groupId = validatedSettlement.data.groupId;
        const members = await storage.getGroupMembers(groupId);
        const isMember = members.some(member => member.id === user.id);
        
        if (!isMember) {
          return res.status(403).json({ message: 'You are not a member of this group' });
        }
        
        // Check that the recipient is also a member of the group
        const isRecipientMember = members.some(member => member.id === validatedSettlement.data.toUserId);
        if (!isRecipientMember) {
          return res.status(400).json({ message: 'The recipient is not a member of this group' });
        }
      }
      
      // Create the transaction object
      // Default status for settlements is now COMPLETED to simplify the flow
      // This matches the recommendation to remove the 2-step confirmation process
      // User can explicitly set a different status if needed
      const transactionData = {
        type: TransactionType.SETTLEMENT,
        description: 'Settlement payment',
        amount: validatedSettlement.data.amount,
        paidByUserId: validatedSettlement.data.fromUserId,
        toUserId: validatedSettlement.data.toUserId,
        groupId: validatedSettlement.data.groupId,
        paymentMethod: validatedSettlement.data.paymentMethod,
        notes: validatedSettlement.data.notes,
        createdByUserId: user.id,
        status: TransactionStatus.COMPLETED, // Default to COMPLETED now
        isEdited: false,
        isDeleted: false
      };
      
      // Create the transaction
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating settlement transaction:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Update a transaction (can be an expense or settlement)
  app.put('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      // Get the existing transaction
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const currentUserId = (req.user as User).id;
      
      // Check authorization based on transaction type
      if (transaction.type === TransactionType.EXPENSE) {
        // For expenses, check if user is creator, payer, or group admin
        const groupId = transaction.groupId;
        if (!groupId) {
          return res.status(400).json({ message: 'Invalid group ID for this transaction' });
        }
        
        const group = await storage.getGroup(groupId);
        if (!group) {
          return res.status(404).json({ message: 'Group not found for this transaction' });
        }
        
        const isGroupAdmin = Number(group.createdById) === Number(currentUserId);
        const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
        const isCreator = Number(transaction.createdByUserId) === Number(currentUserId);
        
        if (!isGroupAdmin && !isPayer && !isCreator) {
          return res.status(403).json({ 
            message: 'Only the transaction creator, payer, or group admin can update this transaction' 
          });
        }
      } else if (transaction.type === TransactionType.SETTLEMENT) {
        // For settlements, check if user is the payer or recipient
        const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
        const isRecipient = Number(transaction.toUserId) === Number(currentUserId);
        
        if (!isPayer && !isRecipient) {
          return res.status(403).json({ 
            message: 'Only the settlement payer or recipient can update this transaction' 
          });
        }
      } else {
        return res.status(400).json({ message: 'Unsupported transaction type' });
      }
      
      // Validate the update data
      const updateSchema = z.object({
        description: z.string().optional(),
        amount: z.string().optional(),
        paidByUserId: z.number().optional(),
        splitType: z.nativeEnum(SplitType).optional(),
        splitDetails: z.string().optional(),
        date: z.date().optional(),
        paymentMethod: z.nativeEnum(PaymentMethod).optional(),
        status: z.nativeEnum(TransactionStatus).optional(),
        notes: z.string().optional().nullable(),
        splitWithUserIds: z.array(z.number()).optional(),
      });
      
      const validatedData = updateSchema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Preserve the original type and groupId
      const updateData = {
        ...validatedData.data,
        type: transaction.type,
        groupId: transaction.groupId
      };
      
      // Update the transaction
      const updatedTransaction = await storage.updateTransaction(id, updateData, currentUserId);
      if (!updatedTransaction) {
        return res.status(500).json({ message: 'Failed to update transaction' });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Delete a transaction (soft delete)
  app.delete('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      // Get the transaction
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      const currentUserId = (req.user as User).id;
      
      // Check authorization based on transaction type
      if (transaction.type === TransactionType.EXPENSE) {
        // For expenses, check if user is creator, payer, or group admin
        const groupId = transaction.groupId;
        if (!groupId) {
          return res.status(400).json({ message: 'Invalid group ID for this transaction' });
        }
        
        const group = await storage.getGroup(groupId);
        if (!group) {
          return res.status(404).json({ message: 'Group not found for this transaction' });
        }
        
        const isGroupAdmin = Number(group.createdById) === Number(currentUserId);
        const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
        const isCreator = Number(transaction.createdByUserId) === Number(currentUserId);
        
        if (!isGroupAdmin && !isPayer && !isCreator) {
          return res.status(403).json({ 
            message: 'Only the transaction creator, payer, or group admin can delete this transaction' 
          });
        }
      } else if (transaction.type === TransactionType.SETTLEMENT) {
        // For settlements, check if user is the payer or recipient
        const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
        const isRecipient = Number(transaction.toUserId) === Number(currentUserId);
        
        if (!isPayer && !isRecipient) {
          return res.status(403).json({ 
            message: 'Only the settlement payer or recipient can delete this transaction' 
          });
        }
      } else {
        return res.status(400).json({ message: 'Unsupported transaction type' });
      }
      
      // Soft delete the transaction
      const updatedTransaction = await storage.deleteTransaction(id, currentUserId);
      if (!updatedTransaction) {
        return res.status(500).json({ message: 'Failed to delete transaction' });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
}