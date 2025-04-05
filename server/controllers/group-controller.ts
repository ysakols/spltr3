import { Request, Response } from "express";
import { storage } from "../storage";
import { insertGroupSchema, insertGroupInvitationSchema } from "@shared/schema";
import { sanitizeUser, isUserInGroup } from "../utils/user-utils";
import crypto from "crypto";
import { createInvitationEmailContent, sendInvitationEmail, hasEmailConfiguration } from "../email";

/**
 * Controller for group-related operations
 */
export const GroupController = {
  /**
   * Get all groups for the authenticated user
   */
  getUserGroups: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Create a new group
   */
  createGroup: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Validate request body
      const groupData = insertGroupSchema.parse({
        ...req.body,
        createdById: userId
      });

      // Create the group
      const group = await storage.createGroup(groupData);

      if (!group) {
        return res.status(500).json({ message: 'Failed to create group' });
      }

      // Add the creator as a member automatically
      await storage.addUserToGroup({
        userId,
        groupId: group.id,
        role: 'admin'
      });

      // Add initial members if provided
      if (req.body.initialMembers && Array.isArray(req.body.initialMembers)) {
        for (const memberId of req.body.initialMembers) {
          if (memberId !== userId) {
            await storage.addUserToGroup({
              userId: memberId,
              groupId: group.id,
              role: 'member'
            });
          }
        }
      }

      res.status(201).json(group);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get a group by ID
   */
  getGroupById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(id));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }

      const group = await storage.getGroup(Number(id));
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      res.json(group);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Update a group
   */
  updateGroup: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if group exists
      const group = await storage.getGroup(Number(id));
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Check if user is a member with admin role
      const userGroup = await storage.getUserGroup(userId, Number(id));
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this group' });
      }

      // Update the group
      const updatedGroup = await storage.updateGroup(Number(id), {
        name: req.body.name,
        description: req.body.description
      });

      if (!updatedGroup) {
        return res.status(500).json({ message: 'Failed to update group' });
      }

      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Delete a group
   */
  deleteGroup: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if group exists
      const group = await storage.getGroup(Number(id));
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Only the group creator can delete the group
      if (group.createdById !== userId) {
        return res.status(403).json({ message: 'Only the group creator can delete the group' });
      }

      // Delete the group
      await storage.deleteGroup(Number(id));

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get group members
   */
  getGroupMembers: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }

      // Get all users in the group
      const users = await storage.getGroupMembers(Number(groupId));
      res.json(users.map(user => sanitizeUser(user)));
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Add user to group
   */
  addGroupMember: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is an admin in the group
      const userGroup = await storage.getUserGroup(userId, Number(groupId));
      if (!userGroup || userGroup.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to add members to this group' });
      }

      // Extract member data
      const memberData = {
        userId: req.body.userId,
        groupId: Number(groupId),
        role: req.body.role || 'member'
      };

      // Add user to group
      const groupMember = await storage.addUserToGroup(memberData);

      if (!groupMember) {
        return res.status(500).json({ message: 'Failed to add member to group' });
      }

      res.status(201).json(groupMember);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Remove user from group
   */
  removeGroupMember: async (req: Request, res: Response) => {
    try {
      const { groupId, userId: targetUserId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // User can remove themselves or admin can remove anyone
      if (Number(targetUserId) !== userId) {
        // Check if user is an admin in the group
        const userGroup = await storage.getUserGroup(userId, Number(groupId));
        if (!userGroup || userGroup.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to remove members from this group' });
        }
      }

      // Check if target user is in the group
      const isMember = await isUserInGroup(Number(targetUserId), Number(groupId));
      if (!isMember) {
        return res.status(404).json({ message: 'User is not a member of this group' });
      }

      // Check if target user is the group creator
      const group = await storage.getGroup(Number(groupId));
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      if (group.createdById === Number(targetUserId)) {
        return res.status(403).json({ message: 'Cannot remove the group creator' });
      }

      // Remove user from group
      await storage.removeUserFromGroup(Number(targetUserId), Number(groupId));

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get expenses for a group
   */
  getGroupExpenses: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }

      const expenses = await storage.getExpensesByGroupId(Number(groupId));
      res.json(expenses);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get expense summary for a group
   */
  getGroupSummary: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }

      const summary = await storage.getGroupSummary(Number(groupId));
      res.json(summary);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Get invitations for a group
   */
  getGroupInvitations: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to access this group' });
      }

      const invitations = await storage.getGroupInvitations(Number(groupId));
      res.json(invitations);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Create a group invitation
   */
  createGroupInvitation: async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, Number(groupId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to invite to this group' });
      }

      const { email } = req.body;
      
      // Check if email is provided
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Check if user is already in the group
        const alreadyMember = await isUserInGroup(existingUser.id, Number(groupId));
        if (alreadyMember) {
          return res.status(400).json({ message: 'User is already a member of this group' });
        }
      }

      // Generate an invitation token
      const token = crypto.randomBytes(20).toString('hex');

      // Create the invitation
      const invitation = await storage.createGroupInvitation({
        groupId: Number(groupId),
        inviterUserId: userId,
        inviteeEmail: email,
        token,
        resendCount: 0,
        status: 'pending',
        inviteeName: req.body.name || null,
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      if (!invitation) {
        return res.status(500).json({ message: 'Failed to create invitation' });
      }

      // Get group details
      const group = await storage.getGroup(Number(groupId));
      
      // Try to send email invitation
      if (hasEmailConfiguration()) {
        try {
          await sendInvitationEmail(invitation, group, req.user);
        } catch (error) {
          console.error('Failed to send invitation email:', error);
          // Still return success, the invitation is created even if email fails
        }
      }

      res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Handle an invitation by token
   */
  getInvitationByToken: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      // Get the invitation
      const invitation = await storage.getGroupInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or expired' });
      }

      // Get the group
      const group = await storage.getGroup(invitation.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Get the inviter
      const inviter = await storage.getUser(invitation.inviterUserId);

      // Return the invitation details
      res.json({
        invitation,
        group,
        inviter: inviter ? sanitizeUser(inviter) : null
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Respond to an invitation
   */
  respondToInvitation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get the invitation
      const invitation = await storage.getGroupInvitation(Number(id));
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      // Check if this invitation is for the current user
      if (invitation.inviteeEmail !== req.user.email) {
        return res.status(403).json({ message: 'Not authorized to respond to this invitation' });
      }

      // Update the invitation status
      const updatedInvitation = await storage.updateGroupInvitation(Number(id), {
        status,
        acceptedAt: status === 'accepted' ? new Date() : null
      });

      if (!updatedInvitation) {
        return res.status(500).json({ message: 'Failed to update invitation' });
      }

      // If accepted, add user to the group
      if (status === 'accepted') {
        await storage.addUserToGroup({
          userId: userId,
          groupId: invitation.groupId,
          role: 'member'
        });
      }

      res.json(updatedInvitation);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  },

  /**
   * Resend an invitation
   */
  resendInvitation: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get the invitation
      const invitation = await storage.getGroupInvitation(Number(id));
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      // Check if user is in the group
      const isMember = await isUserInGroup(userId, invitation.groupId);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to resend invitations for this group' });
      }

      // Update the invitation
      const updatedInvitation = await storage.updateGroupInvitation(Number(id), {
        resendCount: invitation.resendCount + 1,
        lastResendAt: new Date()
      });

      if (!updatedInvitation) {
        return res.status(500).json({ message: 'Failed to update invitation' });
      }

      // Get group details
      const group = await storage.getGroup(invitation.groupId);
      
      // Try to send email invitation
      if (hasEmailConfiguration()) {
        try {
          await sendInvitationEmail(updatedInvitation, group, req.user);
        } catch (error) {
          console.error('Failed to send invitation email:', error);
          // Still return success, the invitation is resent even if email fails
        }
      }

      res.json(updatedInvitation);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unexpected error occurred' });
      }
    }
  }
};