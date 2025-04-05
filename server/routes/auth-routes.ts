import { Express } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { AuthController } from "../controllers/auth-controller";

/**
 * Register authentication routes
 * @param app Express application
 */
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get('/api/auth/me', isAuthenticated, AuthController.getCurrentUser);

  // User login with username/email and password
  app.post('/api/auth/login', AuthController.login);

  // Google OAuth authentication - Start OAuth flow
  app.get('/auth/google', AuthController.googleAuth);

  // Google OAuth authentication - Handle callback
  app.get(
    '/auth/google/callback',
    AuthController.verifyOAuthState,
    AuthController.googleCallback,
    AuthController.googleSuccess
  );

  // User logout
  app.get('/auth/logout', AuthController.logout);

  // User registration
  app.post('/api/auth/register', AuthController.register);
}