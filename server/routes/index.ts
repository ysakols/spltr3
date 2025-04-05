import { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { registerAuthRoutes } from "./auth-routes";
import { registerUserRoutes } from "./user-routes";
import { registerGroupRoutes } from "./group-routes";
import { registerTransactionRoutes } from "./transaction-routes";
import { registerAdminRoutes } from "./admin-routes";

/**
 * Register all routes and initialize WebSocket server
 * @param app Express application
 * @returns HTTP server instance
 */
export async function registerAllRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Initialize WebSocket server for real-time updates
  const wss = new WebSocketServer({ server });
  
  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    // Send a welcome message
    ws.send(JSON.stringify({ type: 'connection', message: 'Connected to WebSocket server' }));
    
    // Handle incoming messages
    ws.on('message', (message: Buffer) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);
        
        // Handle different message types
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Register all route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerGroupRoutes(app);
  registerTransactionRoutes(app);
  registerAdminRoutes(app);
  
  return server;
}