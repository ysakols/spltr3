import { Express, Request, Response } from "express";
import { isAuthenticated } from "../middleware/auth-middleware";
import { storage } from "../storage";
import { sanitizeUser, sanitizeUsers } from "../utils/user-utils";
import { insertGroupSchema, insertExpenseSchema, insertGroupInvitationSchema } from "@shared/schema";
import { hasEmailConfiguration, sendInvitationEmail } from "../email";

/**
 * Register group-related routes
 * @param app Express application
 */
export function registerGroupRoutes(app: Express): void {
  // Get all groups for the current user
  app.get('/api/groups', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      if (!userId) {
        return res.status(403).json({ message: 'Not authorized to view these groups' });
      }
      
      const groups = await storage.getGroupsByUserId(userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving groups' });
    }
  });

  // Create a new group
  app.post('/api/groups', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Validate the request body
      const groupData = insertGroupSchema.parse(req.body);
      
      // Create the group
      const newGroup = await storage.createGroup({
        ...groupData,
        createdBy: userId
      });
      
      if (!newGroup) {
        return res.status(500).json({ message: 'Failed to create group' });
      }
      
      // Add the creator as a member
      await storage.addUserToGroup(newGroup.id, userId);
      
      return res.status(201).json(newGroup);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Get group by ID
  app.get('/api/groups/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view this group' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      return res.json(group);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving group' });
    }
  });

  // Update group
  app.put('/api/groups/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to update this group' });
      }
      
      // Get existing group
      const existingGroup = await storage.getGroup(groupId);
      if (!existingGroup) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Update group
      const updatedGroup = await storage.updateGroup(groupId, req.body);
      if (!updatedGroup) {
        return res.status(500).json({ message: 'Failed to update group' });
      }
      
      return res.json(updatedGroup);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Delete group
  app.delete('/api/groups/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group and created the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      if (group.createdBy !== userId) {
        return res.status(403).json({ message: 'Only the group creator can delete the group' });
      }
      
      // Delete group
      await storage.deleteGroup(groupId);
      
      return res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting group' });
    }
  });

  // Get group members
  app.get('/api/groups/:groupId/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view this group members' });
      }
      
      const members = await storage.getUsersByGroupId(groupId);
      return res.json(sanitizeUsers(members));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving group members' });
    }
  });

  // Add user to group
  app.post('/api/groups/:groupId/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const currentUser = req.user as any;
      const currentUserId = currentUser.id;
      
      // Check if current user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, currentUserId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to add members to this group' });
      }
      
      // Check if user to add exists
      const userToAdd = await storage.getUser(userId);
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Add user to group
      await storage.addUserToGroup(groupId, userId);
      
      return res.status(201).json({ message: 'User added to group successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error adding user to group' });
    }
  });

  // Remove user from group
  app.delete('/api/groups/:groupId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      const currentUser = req.user as any;
      const currentUserId = currentUser.id;
      
      // Check if current user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, currentUserId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to remove members from this group' });
      }
      
      // Check if current user is removing themselves or is the group creator
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      if (userId !== currentUserId && group.createdBy !== currentUserId) {
        return res.status(403).json({ message: 'Only the group creator can remove other members' });
      }
      
      // Remove user from group
      await storage.removeUserFromGroup(groupId, userId);
      
      return res.json({ message: 'User removed from group successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error removing user from group' });
    }
  });

  // Get group expenses
  app.get('/api/groups/:groupId/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view expenses for this group' });
      }
      
      const expenses = await storage.getExpensesByGroupId(groupId);
      return res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving group expenses' });
    }
  });

  // Create expense
  app.post('/api/groups/:groupId/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to add expenses to this group' });
      }
      
      // Validate expense data
      const expenseData = insertExpenseSchema.parse({
        ...req.body,
        groupId,
        paidBy: userId
      });
      
      // Create expense
      const newExpense = await storage.createExpense(expenseData);
      if (!newExpense) {
        return res.status(500).json({ message: 'Failed to create expense' });
      }
      
      return res.status(201).json(newExpense);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Update expense
  app.put('/api/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const expenseId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the expense
      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Check if user is a member of the group that owns the expense
      const isMember = await storage.isUserInGroup(expense.groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to update this expense' });
      }
      
      // Only the person who paid can edit the expense
      if (expense.paidBy !== userId) {
        return res.status(403).json({ message: 'Only the person who paid can edit the expense' });
      }
      
      // Update expense
      const updatedExpense = await storage.updateExpense(expenseId, req.body);
      if (!updatedExpense) {
        return res.status(500).json({ message: 'Failed to update expense' });
      }
      
      return res.json(updatedExpense);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Delete expense
  app.delete('/api/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const expenseId = parseInt(req.params.id);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the expense
      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Check if user is a member of the group that owns the expense
      const isMember = await storage.isUserInGroup(expense.groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to delete this expense' });
      }
      
      // Only the person who paid can delete the expense
      if (expense.paidBy !== userId) {
        return res.status(403).json({ message: 'Only the person who paid can delete the expense' });
      }
      
      // Delete expense
      await storage.deleteExpense(expenseId);
      
      return res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting expense' });
    }
  });

  // Get group summary (balances between members)
  app.get('/api/groups/:groupId/summary', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view summary for this group' });
      }
      
      const summary = await storage.getGroupSummary(groupId);
      return res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Error calculating group summary' });
    }
  });

  // Get group invitations
  app.get('/api/groups/:groupId/invitations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view invitations for this group' });
      }
      
      const invitations = await storage.getGroupInvitationsByGroupId(groupId);
      return res.json(invitations);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving group invitations' });
    }
  });

  // Create group invitation
  app.post('/api/groups/:groupId/invitations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(groupId, userId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to invite users to this group' });
      }
      
      // Get the group to include in email notification
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if email is provided
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Generate invitation token
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      
      // If user exists, check if they're already a member of the group
      if (existingUser) {
        const isAlreadyMember = await storage.isUserInGroup(groupId, existingUser.id);
        if (isAlreadyMember) {
          return res.status(400).json({ message: 'User is already a member of this group' });
        }
      }
      
      // Create invitation
      const invitationData = {
        groupId,
        inviterUserId: userId,
        email,
        token,
        status: 'pending',
        createdAt: new Date()
      };
      
      const newInvitation = await storage.createGroupInvitation(invitationData);
      if (!newInvitation) {
        return res.status(500).json({ message: 'Failed to create invitation' });
      }
      
      // Send invitation email if email service is configured
      if (hasEmailConfiguration()) {
        try {
          await sendInvitationEmail(newInvitation, group, currentUser);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Continue even if email fails
        }
      }
      
      return res.status(201).json(newInvitation);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Handle invitation response (accept/decline)
  app.put('/api/invitations/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const invitationId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Valid status (accepted/declined) is required' });
      }
      
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Get the invitation
      const invitation = await storage.getGroupInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Ensure the invitation is for the current user
      if (invitation.email !== currentUser.email) {
        return res.status(403).json({ message: 'Not authorized to respond to this invitation' });
      }
      
      // Update invitation status
      const updatedInvitation = await storage.updateGroupInvitation(invitationId, {
        status,
        acceptedAt: status === 'accepted' ? new Date() : undefined
      });
      
      if (!updatedInvitation) {
        return res.status(500).json({ message: 'Failed to update invitation' });
      }
      
      // If accepted, add user to group
      if (status === 'accepted') {
        await storage.addUserToGroup(invitation.groupId, userId);
      }
      
      return res.json(updatedInvitation);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  });

  // Get invitation by token
  app.get('/api/invitations/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      const invitation = await storage.getGroupInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Get group information
      const group = await storage.getGroup(invitation.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Get inviter information if available
      let inviter = null;
      if (invitation.inviterUserId) {
        const inviterUser = await storage.getUser(invitation.inviterUserId);
        if (inviterUser) {
          inviter = sanitizeUser(inviterUser);
        }
      }
      
      return res.json({
        invitation,
        group,
        inviter
      });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving invitation' });
    }
  });

  // Resend invitation email
  app.post('/api/invitations/:id/resend', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const invitationId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get the invitation
      const invitation = await storage.getGroupInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Get the group
      const group = await storage.getGroup(invitation.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is a member of the group
      const isMember = await storage.isUserInGroup(group.id, currentUser.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to resend invitations for this group' });
      }
      
      // Send invitation email if email service is configured
      if (hasEmailConfiguration()) {
        try {
          await sendInvitationEmail(invitation, group, currentUser);
          return res.json({ message: 'Invitation email sent successfully' });
        } catch (emailError) {
          console.error('Failed to resend invitation email:', emailError);
          return res.status(500).json({ message: 'Failed to send invitation email' });
        }
      } else {
        return res.status(400).json({ message: 'Email service is not configured' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error resending invitation' });
    }
  });
}