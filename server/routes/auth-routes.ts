import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { sanitizeUser } from "../utils/user-utils";
import bcrypt from "bcrypt";
import passport from "passport";
import { isAuthenticated } from "../middleware/auth-middleware";
import { processPendingInvitations } from "../auth";
import { insertUserSchema } from "@shared/schema";

/**
 * Register authentication routes
 * @param app Express application
 */
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get('/api/auth/me', isAuthenticated, (req: Request, res: Response) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving current user' });
    }
  });

  // User login with username/email and password
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Set user in session
      req.login(sanitizeUser(user), async (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error during login' });
        }
        
        // Process any pending invitations for this user
        await processPendingInvitations(user.id, user.email);
        
        res.json(sanitizeUser(user));
      });
    } catch (error) {
      res.status(500).json({ message: 'Error during login' });
    }
  });

  // Google OAuth authentication - Start OAuth flow
  app.get('/auth/google', (req: Request, res: Response, next: NextFunction) => {
    // Generate a random state value to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    const authenticator = passport.authenticate('google', {
      scope: ['profile', 'email'],
      state
    });
    
    authenticator(req, res, next);
  });

  // Google OAuth authentication - Handle callback
  app.get(
    '/auth/google/callback',
    (req: Request, res: Response, next: NextFunction) => {
      // Verify state parameter to prevent CSRF
      const receivedState = req.query.state as string;
      const originalState = req.session.oauthState;
      
      if (!receivedState || !originalState || receivedState !== originalState) {
        return res.status(400).json({ message: 'Invalid OAuth state' });
      }
      
      // Clear state from session
      delete req.session.oauthState;
      
      // Continue with authentication
      next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('google', { 
        failureRedirect: '/login?error=google-auth-failed' 
      })(req, res, next);
    },
    (req: Request, res: Response) => {
      // Successful authentication
      res.redirect('/');
    }
  );

  // User logout
  app.get('/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during logout' });
      }
      
      res.redirect('/login');
    });
  });

  // User registration
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email is already in use
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Check if username is already in use
      if (userData.username) {
        const existingUserByUsername = await storage.getUserByUsername(userData.username);
        if (existingUserByUsername) {
          return res.status(400).json({ message: 'Username already in use' });
        }
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      if (!newUser) {
        return res.status(500).json({ message: 'Failed to create user' });
      }
      
      // Log in the new user
      req.login(sanitizeUser(newUser), async (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error during login after registration' });
        }
        
        // Process any pending invitations for this user
        await processPendingInvitations(newUser.id, newUser.email);
        
        res.status(201).json(sanitizeUser(newUser));
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });
}