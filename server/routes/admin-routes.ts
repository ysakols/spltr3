import { Express } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { AdminController } from "../controllers/admin-controller";

/**
 * Register admin routes
 * @param app Express application
 */
export function registerAdminRoutes(app: Express): void {
  // Verify transaction
  app.get('/api/admin/transactions/:id/verify', isAuthenticated, AdminController.verifyTransaction);
  
  // Reconcile transaction
  app.post('/api/admin/transactions/:id/reconcile', isAuthenticated, AdminController.reconcileTransaction);
  
  // Find inconsistent transactions
  app.get('/api/admin/transactions/inconsistencies', isAuthenticated, AdminController.findInconsistentTransactions);
  
  // Reconcile all inconsistent transactions
  app.post('/api/admin/transactions/reconcile-all', isAuthenticated, AdminController.reconcileAllTransactions);
  
  // Find duplicate settlements
  app.get('/api/admin/cleanup/find-duplicates', isAuthenticated, AdminController.findDuplicateSettlements);
  
  // Delete duplicate settlements
  app.post('/api/admin/cleanup/delete-duplicates', isAuthenticated, AdminController.deleteDuplicateSettlements);
  
  // Migrate to unified system
  app.get('/api/migrate-to-unified-system', isAuthenticated, AdminController.migrateToUnifiedSystem);
}