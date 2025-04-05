import { Express, Request, Response } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { storage } from "../storage";
import { sanitizeUser, sanitizeUsers } from "../utils/user-utils";
import bcrypt from "bcrypt";
import { insertUserSchema } from "@shared/schema";

/**
 * Register user-related routes
 * @param app Express application
 */
export function registerUserRoutes(app: Express): void {
  // Create a new user (admin function)
  app.post('/api/users', async (req: Request, res: Response) => {
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
      
      // Return user without sensitive data
      return res.status(201).json(sanitizeUser(newUser));
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Get user by ID
  app.get('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure current user can only view their own profile or they are an admin
      const currentUser = req.user as any;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this user' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      return res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user' });
    }
  });

  // Update user
  app.put('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure current user can only update their own profile or they are an admin
      const currentUser = req.user as any;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this user' });
      }
      
      // Get existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update user' });
      }
      
      return res.json(sanitizeUser(updatedUser));
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Update user password
  app.put('/api/users/:id/password', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure current user can only update their own password or they are an admin
      const currentUser = req.user as any;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this user password' });
      }
      
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      
      // Get existing user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update password' });
      }
      
      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Get all users
  app.get('/api/users', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      return res.json(sanitizeUsers(users));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving users' });
    }
  });

  // Get user's friends (users they share groups with)
  app.get('/api/users/:id/friends', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure current user can only view their own friends or they are an admin
      const currentUser = req.user as any;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this user friends' });
      }
      
      // Get all groups for this user
      const groups = await storage.getGroupsByUserId(userId);
      
      // Get all unique users from these groups
      const userPromises = groups.map(group => storage.getUsersByGroupId(group.id));
      const groupsUsers = await Promise.all(userPromises);
      
      // Flatten the array and remove duplicates
      const allUsers = groupsUsers.flat();
      const uniqueUserIds = new Set<number>();
      const friends = allUsers.filter(user => {
        if (user.id === userId || uniqueUserIds.has(user.id)) return false;
        uniqueUserIds.add(user.id);
        return true;
      });
      
      return res.json(sanitizeUsers(friends));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user friends' });
    }
  });

  // Get user's global summary (balances across all groups)
  app.get('/api/users/:userId/global-summary', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure current user can only view their own summary or they are an admin
      const currentUser = req.user as any;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view this summary' });
      }
      
      const summary = await storage.getUserGlobalSummary(userId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user global summary' });
    }
  });
}