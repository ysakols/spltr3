import { Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { db } from './db';
import { storage } from './storage';
import { Transaction, TransactionType } from '../shared/schema';

interface DuplicateGroup {
  fromUserId: number;
  toUserId: number;
  amount: number;
  groupId: number | null;
  transactions: Transaction[];
}

/**
 * Find settlement transactions that are likely duplicates based on matching:
 * - fromUserId (payer)
 * - toUserId (recipient)
 * - amount
 * - groupId
 * - created within a 5-minute window
 */
export async function findDuplicateSettlements(): Promise<DuplicateGroup[]> {
  try {
    // Get all settlement transactions
    const allSettlements = await storage.getAllTransactionsByType(TransactionType.SETTLEMENT);
    
    // Group potential duplicates
    const potentialDuplicates: Record<string, Transaction[]> = {};
    
    for (const settlement of allSettlements) {
      // Skip deleted transactions
      if (settlement.deletedAt) continue;
      
      // Create a key based on transaction details
      const key = `${settlement.paidByUserId}-${settlement.toUserId}-${settlement.amount}-${settlement.groupId || 'null'}`;
      
      if (!potentialDuplicates[key]) {
        potentialDuplicates[key] = [];
      }
      
      potentialDuplicates[key].push(settlement);
    }
    
    // Filter for actual duplicates (more than 1 transaction with same key)
    const duplicateGroups: DuplicateGroup[] = [];
    
    for (const [key, transactions] of Object.entries(potentialDuplicates)) {
      if (transactions.length > 1) {
        // Sort by creation date to keep oldest first
        transactions.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // Extract group details from first transaction
        const fromUserId = transactions[0].paidByUserId!;
        const toUserId = transactions[0].toUserId!;
        const amount = Number(transactions[0].amount);
        const groupId = transactions[0].groupId;
        
        duplicateGroups.push({
          fromUserId,
          toUserId,
          amount,
          groupId,
          transactions
        });
      }
    }
    
    return duplicateGroups;
  } catch (error) {
    console.error('Error finding duplicate settlements:', error);
    return [];
  }
}

/**
 * Cleanup duplicate settlements by soft-deleting all but the first settlement in each duplicate group
 */
export async function cleanupDuplicateSettlements(): Promise<{
  duplicatesFound: number;
  transactionsDeleted: number;
}> {
  try {
    const duplicateGroups = await findDuplicateSettlements();
    let transactionsDeleted = 0;
    
    for (const group of duplicateGroups) {
      // Keep the first (oldest) transaction, delete the rest
      for (let i = 1; i < group.transactions.length; i++) {
        await storage.deleteTransaction(group.transactions[i].id, 1); // Use admin user ID for audit trail
        transactionsDeleted++;
      }
    }
    
    return {
      duplicatesFound: duplicateGroups.length,
      transactionsDeleted
    };
  } catch (error) {
    console.error('Error cleaning up duplicate settlements:', error);
    return {
      duplicatesFound: 0,
      transactionsDeleted: 0
    };
  }
}

export function registerCleanupRoutes(app: any) {
  // Endpoint to find potential duplicates without deleting them
  app.get('/api/admin/cleanup/find-duplicates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users or the original developer (ID 2)
      const currentUserId = (req.user as any).id;
      if (currentUserId !== 2) {
        return res.status(403).json({ message: 'Only administrators can access this endpoint' });
      }
      
      const duplicateGroups = await findDuplicateSettlements();
      
      return res.json({
        success: true,
        duplicateGroupsCount: duplicateGroups.length,
        duplicateGroups: duplicateGroups.map(group => ({
          fromUserId: group.fromUserId,
          toUserId: group.toUserId,
          amount: group.amount,
          groupId: group.groupId,
          transactionCount: group.transactions.length,
          transactionIds: group.transactions.map(t => t.id),
          createdDates: group.transactions.map(t => t.createdAt)
        }))
      });
    } catch (error) {
      console.error('Error finding duplicate settlements:', error);
      return res.status(500).json({ message: 'Failed to find duplicate settlements', error });
    }
  });
  
  // Endpoint to perform the cleanup
  app.post('/api/admin/cleanup/delete-duplicates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Only allow admin users or the original developer (ID 2)
      const currentUserId = (req.user as any).id;
      if (currentUserId !== 2) {
        return res.status(403).json({ message: 'Only administrators can access this endpoint' });
      }
      
      const result = await cleanupDuplicateSettlements();
      
      return res.json({
        success: true,
        message: `Found ${result.duplicatesFound} duplicate groups and deleted ${result.transactionsDeleted} redundant transactions`,
        ...result
      });
    } catch (error) {
      console.error('Error cleaning up duplicate settlements:', error);
      return res.status(500).json({ message: 'Failed to clean up duplicate settlements', error });
    }
  });
}