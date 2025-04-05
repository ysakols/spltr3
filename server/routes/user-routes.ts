import { Express } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { UserController } from "../controllers/user-controller";

/**
 * Register user routes
 * @param app Express application
 */
export function registerUserRoutes(app: Express): void {
  // Create a new user
  app.post('/api/users', UserController.createUser);
  
  // Get user by ID
  app.get('/api/users/:id', isAuthenticated, UserController.getUserById);
  
  // Update user
  app.put('/api/users/:id', isAuthenticated, UserController.updateUser);
  
  // Update user password
  app.put('/api/users/:id/password', isAuthenticated, UserController.updatePassword);
  
  // Get all users
  app.get('/api/users', isAuthenticated, UserController.getAllUsers);
  
  // Get user's global summary
  app.get('/api/users/:userId/global-summary', isAuthenticated, UserController.getUserGlobalSummary);
}