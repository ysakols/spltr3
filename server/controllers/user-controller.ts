import { Request, Response } from "express";
import { storage } from "../storage";
import { sanitizeUser, sanitizeUsers } from "../utils/user-utils";
import bcrypt from "bcrypt";
import { insertUserSchema, users } from "@shared/schema";
import { db } from "../db";

/**
 * Controller for user-related operations
 */
export const UserController = {
  /**
   * Get user by ID
   */
  getUserById: async (req: Request, res: Response) => {
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
  },

  /**
   * Create a new user
   */
  createUser: async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email is already in use
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'Email already in use' });
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
  },

  /**
   * Update user
   */
  updateUser: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure current user can only update their own profile
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
  },

  /**
   * Update user password
   */
  updatePassword: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Ensure current user can only update their own password
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
  },

  /**
   * Get all users
   */
  getAllUsers: async (_req: Request, res: Response) => {
    try {
      // Just use the storage interface to get all users
      const allUsers = await storage.getUsers();
      return res.json(sanitizeUsers(allUsers));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving users' });
    }
  },

  /**
   * Get user's global summary (balances across all groups)
   */
  getUserGlobalSummary: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Ensure current user can only view their own summary
      const currentUser = req.user as any;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view this summary' });
      }
      
      const summary = await storage.calculateGlobalSummary(userId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user global summary' });
    }
  }
};