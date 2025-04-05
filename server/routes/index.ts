import { Express } from 'express';
import { Server } from 'http';
import { registerAuthRoutes } from './auth-routes';
import { registerUserRoutes } from './user-routes';
import { registerGroupRoutes } from './group-routes';
import { registerTransactionRoutes } from './transaction-routes';
import { registerAdminRoutes } from './admin-routes';
import { migrationRouteHandler } from '../migrateToUnifiedSystem';
import { registerCleanupRoutes } from '../cleanup-duplicate-settlements';
import { isAuthenticated } from '../middleware/auth-middleware';

/**
 * Register all API routes
 * @param app Express application
 * @returns HTTP server instance
 */
export async function registerAllRoutes(app: Express): Promise<Server> {
  // Register auth routes
  registerAuthRoutes(app);
  
  // Register user routes
  registerUserRoutes(app);
  
  // Register group routes
  registerGroupRoutes(app);
  
  // Register transaction routes
  registerTransactionRoutes(app);
  
  // Register admin routes
  registerAdminRoutes(app);
  
  // Register cleanup routes for duplicate settlements
  registerCleanupRoutes(app);
  
  // Add migration endpoint
  app.get('/api/migrate-to-unified-system', isAuthenticated, migrationRouteHandler);
  
  // We're not setting up our own HTTP server or WebSocket server here
  // This will be handled by setupVite in server/vite.ts
  return null as unknown as Server;
}