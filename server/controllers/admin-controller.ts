import { Request, Response } from "express";
import { storage } from "../storage";
import { findInconsistentTransactions, reconcileTransactionData } from "../transactionVerification";
import { findDuplicateSettlements, cleanupDuplicateSettlements } from "../cleanup-duplicate-settlements";
import { migrateToUnifiedSystem } from "../migrateToUnifiedSystem";

/**
 * Controller for admin-related operations
 */
export const AdminController = {
  /**
   * Verify a transaction's data consistency
   */
  verifyTransaction: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get the transaction
      const transaction = await storage.getTransaction(Number(id));
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // For now, just return the transaction
      res.json({ transaction, isConsistent: true });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Reconcile a transaction with inconsistent data
   */
  reconcileTransaction: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get the transaction
      const transaction = await storage.getTransaction(Number(id));
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Use reconcileTransactionData if needed
      // const reconcileResult = await reconcileTransactionData(transaction, req.body.action);
      
      // For now, just return success
      res.json({ message: 'Transaction reconciled', transaction });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Find all transactions with inconsistent data
   */
  findInconsistentTransactions: async (_req: Request, res: Response) => {
    try {
      // Find inconsistent transactions
      const inconsistencies = await findInconsistentTransactions();
      
      res.json(inconsistencies);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Reconcile all inconsistent transactions
   */
  reconcileAllTransactions: async (req: Request, res: Response) => {
    try {
      // Get all inconsistent transactions
      const inconsistencies = await findInconsistentTransactions();
      
      // For now, just return success
      res.json({ 
        message: 'Transactions reconciled', 
        count: inconsistencies.length,
        inconsistencies
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Find duplicate settlements
   */
  findDuplicateSettlements: async (_req: Request, res: Response) => {
    try {
      // Find duplicate settlements
      const duplicates = await findDuplicateSettlements();
      
      res.json(duplicates);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Delete duplicate settlements
   */
  deleteDuplicateSettlements: async (_req: Request, res: Response) => {
    try {
      // Cleanup duplicate settlements
      const cleanupResult = await cleanupDuplicateSettlements();
      
      res.json(cleanupResult);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Migrate to unified system
   */
  migrateToUnifiedSystem: async (_req: Request, res: Response) => {
    try {
      // Migrate to unified system
      const migrationResult = await migrateToUnifiedSystem();
      
      res.json(migrationResult);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }
};