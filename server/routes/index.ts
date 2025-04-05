import { Express } from 'express';
import { Server, createServer } from 'http';
import { WebSocketServer } from 'ws';
import { registerAuthRoutes } from './auth-routes';
import { registerUserRoutes } from './user-routes';
import { registerGroupRoutes } from './group-routes';
import { registerTransactionRoutes } from './transaction-routes';
import { registerAdminRoutes } from './admin-routes';

/**
 * Register all API routes
 * @param app Express application
 * @returns HTTP server instance
 */
export async function registerAllRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ server });
  
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
  
  return server;
}