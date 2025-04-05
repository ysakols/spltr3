import { Express } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { TransactionController } from "../controllers/transaction-controller";

/**
 * Register transaction routes
 * @param app Express application
 */
export function registerTransactionRoutes(app: Express): void {
  // Get transactions for a group
  app.get('/api/groups/:groupId/transactions', isAuthenticated, TransactionController.getGroupTransactions);
  
  // Get a single transaction
  app.get('/api/transactions/:id', isAuthenticated, TransactionController.getTransactionById);
  
  // Create a new transaction
  app.post('/api/transactions', isAuthenticated, TransactionController.createTransaction);
  
  // Update a transaction
  app.patch('/api/transactions/:id', isAuthenticated, TransactionController.updateTransaction);
  
  // Delete a transaction
  app.delete('/api/transactions/:id', isAuthenticated, TransactionController.deleteTransaction);
  
  // Get user's transactions
  app.get('/api/users/:userId/transactions', isAuthenticated, TransactionController.getUserTransactions);
  
  // Create a settlement
  app.post('/api/settlements', isAuthenticated, TransactionController.createSettlement);
  
  // Get a user's settlements
  app.get('/api/users/:userId/settlements', isAuthenticated, TransactionController.getUserSettlements);
  
  // Get settlements for a group
  app.get('/api/groups/:groupId/settlements', isAuthenticated, TransactionController.getGroupSettlements);
  
  // Update a settlement
  app.put('/api/settlements/:id', isAuthenticated, TransactionController.updateSettlement);
  
  // Delete a settlement
  app.delete('/api/settlements/:id', isAuthenticated, TransactionController.deleteSettlement);
}