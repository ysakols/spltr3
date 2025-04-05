import { Express, Request, Response } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { 
  verifyTransactionConsistency, 
  reconcileTransactionData, 
  findInconsistentTransactions 
} from '../transactionVerification';
import { 
  findDuplicateSettlements, 
  cleanupDuplicateSettlements 
} from '../cleanup-duplicate-settlements';
import { migrationRouteHandler } from '../migrateToUnifiedSystem';

/**
 * Register admin-related routes
 * @param app Express application
 */
export function registerAdminRoutes(app: Express): void {
  // Verify transaction consistency
  app.get('/api/admin/transactions/:id/verify', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      
      // Verify the transaction
      const result = await verifyTransactionConsistency(transactionId);
      
      return res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error verifying transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reconcile transaction data
  app.post('/api/admin/transactions/:id/reconcile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactionId = parseInt(req.params.id);
      
      // Reconcile the transaction
      const result = await reconcileTransactionData(transactionId);
      
      return res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error reconciling transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Find inconsistent transactions
  app.get('/api/admin/transactions/inconsistencies', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Find inconsistent transactions
      const result = await findInconsistentTransactions();
      
      return res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error finding inconsistent transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reconcile all inconsistent transactions
  app.post('/api/admin/transactions/reconcile-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Find inconsistent transactions
      const inconsistencies = await findInconsistentTransactions();
      
      // Reconcile each inconsistent transaction
      const results = [];
      for (const inconsistency of inconsistencies) {
        try {
          const result = await reconcileTransactionData(inconsistency.id);
          results.push({
            transactionId: inconsistency.id,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            transactionId: inconsistency.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return res.json({
        totalInconsistencies: inconsistencies.length,
        results
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error reconciling transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Find duplicate settlements
  app.get('/api/admin/cleanup/find-duplicates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Find duplicate settlements
      const duplicates = await findDuplicateSettlements();
      
      return res.json({
        duplicateGroups: duplicates.length,
        duplicates
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error finding duplicate settlements',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete duplicate settlements
  app.post('/api/admin/cleanup/delete-duplicates', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Clean up duplicate settlements
      const result = await cleanupDuplicateSettlements();
      
      return res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error deleting duplicate settlements',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Migrate to unified system
  app.get('/api/migrate-to-unified-system', isAuthenticated, migrationRouteHandler);
}