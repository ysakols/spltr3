import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGroupSchema, insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all groups
  app.get('/api/groups', async (req: Request, res: Response) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Create a new group
  app.post('/api/groups', async (req: Request, res: Response) => {
    try {
      const validatedData = insertGroupSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      const savedGroup = await storage.createGroup(validatedData.data);
      res.status(201).json(savedGroup);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Get a specific group
  app.get('/api/groups/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      
      res.json(group);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update a group
  app.put('/api/groups/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      console.log('Received PUT request for group:', id);
      console.log('Request body:', req.body);
      
      const validatedData = insertGroupSchema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        console.error('Validation error:', error.message);
        return res.status(400).json({ message: error.message });
      }
      
      const group = await storage.getGroup(id);
      if (!group) {
        console.error('Group not found:', id);
        return res.status(404).json({ message: 'Group not found' });
      }
      
      console.log('Updating group with data:', validatedData.data);
      const updatedGroup = await storage.updateGroup(id, validatedData.data);
      console.log('Group updated successfully:', updatedGroup);
      res.json(updatedGroup);
    } catch (err) {
      console.error('Error updating group:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Get all expenses for a group
  app.get('/api/groups/:groupId/expenses', async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const expenses = await storage.getExpenses(groupId);
      res.json(expenses);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Add a new expense
  app.post('/api/groups/:groupId/expenses', async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      
      // If splitWith is not provided, use all group members
      const expenseData = {
        ...req.body,
        groupId,
        splitWith: req.body.splitWith || group.people
      };
      
      const validatedData = insertExpenseSchema.safeParse(expenseData);
      
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      const savedExpense = await storage.createExpense(validatedData.data);
      res.status(201).json(savedExpense);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Delete an expense
  app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      const expense = await storage.getExpense(id);
      if (!expense) return res.status(404).json({ message: 'Expense not found' });
      
      await storage.deleteExpense(id);
      res.json({ message: 'Expense deleted' });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update an expense
  app.put('/api/expenses/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      console.log('Received PUT request for expense:', id);
      console.log('Request body:', req.body);
      
      const expense = await storage.getExpense(id);
      if (!expense) {
        console.error('Expense not found:', id);
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Retain the original groupId
      const updatedData = {
        ...req.body,
        groupId: expense.groupId
      };
      
      const validatedData = insertExpenseSchema.safeParse(updatedData);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        console.error('Validation error:', error.message);
        return res.status(400).json({ message: error.message });
      }
      
      console.log('Updating expense with data:', validatedData.data);
      const updatedExpense = await storage.updateExpense(id, validatedData.data);
      console.log('Expense updated successfully:', updatedExpense);
      res.json(updatedExpense);
    } catch (err) {
      console.error('Error updating expense:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Calculate summary
  app.get('/api/groups/:groupId/summary', async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      
      const summary = await storage.calculateSummary(groupId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
