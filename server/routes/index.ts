import { Express } from 'express';
import { Server, createServer } from 'http';
import { WebSocketServer } from 'ws';
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
  // Create HTTP server
  const server = createServer(app);
  
  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ server });
  
  // Set up WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send a welcome message
    ws.send(JSON.stringify({ type: 'connection', message: 'Connected to WebSocket server' }));
    
    // Handle messages from clients
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);
        
        // You can handle specific message types here
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
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
  
  return server;
}