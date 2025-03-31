import { Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { 
  verifyTransactionConsistency, 
  reconcileTransactionData, 
  findInconsistentTransactions 
} from './transactionVerification';
import { Express } from 'express';

export function registerAdminRoutes(app: Express): void {
  // Transaction verification routes (admin/data utility endpoints)
  // Note: These routes can be protected by admin authorization later
  
  // Check a specific transaction
  app.get('/api/admin/transactions/:id/verify', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      const result = await verifyTransactionConsistency(id);
      
      res.json(result);
    } catch (err) {
      console.error('Error verifying transaction:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Fix a specific transaction
  app.post('/api/admin/transactions/:id/reconcile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      const result = await reconcileTransactionData(id);
      
      res.json(result);
    } catch (err) {
      console.error('Error reconciling transaction:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Find all transactions with inconsistencies
  app.get('/api/admin/transactions/inconsistencies', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const inconsistencies = await findInconsistentTransactions();
      
      res.json({
        count: inconsistencies.length,
        inconsistencies
      });
    } catch (err) {
      console.error('Error finding inconsistent transactions:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Fix all inconsistent transactions
  app.post('/api/admin/transactions/reconcile-all', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // First, find all inconsistent transactions
      const inconsistencies = await findInconsistentTransactions();
      
      // Then reconcile each one
      const results = [];
      
      for (const inconsistency of inconsistencies) {
        try {
          const result = await reconcileTransactionData(inconsistency.transactionId);
          results.push({
            transactionId: inconsistency.transactionId,
            result,
            success: true
          });
        } catch (err) {
          results.push({
            transactionId: inconsistency.transactionId,
            success: false,
            error: (err as Error).message
          });
        }
      }
      
      res.json({
        processed: inconsistencies.length,
        results
      });
    } catch (err) {
      console.error('Error reconciling all transactions:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
}