import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGroupSchema, insertExpenseSchema, insertUserSchema, users, User,
  insertSettlementSchema, Settlement, SettlementStatus, PaymentMethod,
  Group, GroupInvitation, groupInvitations, InsertGroupInvitation
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { db } from "./db";
import passport from "./auth";
import { isAuthenticated } from "./auth";
import crypto from "crypto";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  // ==========================================================
  
  // Get current authenticated user
  app.get('/api/auth/me', isAuthenticated, (req: Request, res: Response) => {
    res.json(req.user);
  });
  
  // Local login route
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }
      
      // Check if using the bcrypt hashed password or still using plaintext
      let isPasswordValid = false;
      
      if (user.password && user.password.startsWith('$2')) {
        // This is a bcrypt hash, use proper comparison
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Fall back to direct comparison for backward compatibility
        // This is for existing accounts in the dev environment
        isPasswordValid = user.password === password;
      }
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            message: 'Error during login' 
          });
        }
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        
        return res.json({ 
          success: true, 
          user: userWithoutPassword 
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error during login' 
      });
    }
  });
  
  // Google OAuth routes
  app.get('/auth/google', 
    (req: Request, res: Response, next: NextFunction) => {
      // Store redirect URL in session if provided
      if (req.query.redirect) {
        req.session.redirectTo = req.query.redirect as string;
      }
      next();
    },
    passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    })
  );
  
  app.get('/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/login' 
    }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to stored path or home
      const redirectTo = req.session.redirectTo || '/';
      delete req.session.redirectTo; // Clean up
      res.redirect(redirectTo);
    }
  );
  
  // Logout route
  app.get('/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.redirect('/');
    });
  });
  
  // Group invitation handling
  app.get('/api/invitations/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      const invitation = await storage.getGroupInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Check if the invitation is expired
      const now = new Date();
      const expired = invitation.expiresAt && new Date(invitation.expiresAt) < now;
      
      if (expired) {
        return res.status(400).json({ message: 'Invitation has expired' });
      }
      
      // If user is logged in, process the invitation immediately
      if (req.isAuthenticated() && req.user) {
        const user = req.user as User;
        
        // Add the user to the group
        await storage.addUserToGroup(invitation.groupId, user.id);
        
        // Mark invitation as accepted
        await storage.updateGroupInvitation(invitation.id, {
          status: 'accepted',
          acceptedAt: new Date()
        });
        
        return res.json({ 
          message: 'Invitation accepted',
          groupId: invitation.groupId
        });
      }
      
      // If not logged in, return the invitation details so frontend
      // can prompt user to login/register
      return res.json({
        invitation: {
          ...invitation,
          isExpired: expired,
          requiresAuthentication: true
        }
      });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Create a group invitation
  app.post('/api/groups/:groupId/invitations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      // Check if group exists
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      const schema = z.object({
        email: z.string().email(),
        userId: z.number().int().optional()
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      const { email, userId } = validatedData.data;
      const currentUser = req.user as User;
      
      // Check if the user is already a member of the group
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const members = await storage.getGroupMembers(groupId);
        const isAlreadyMember = members.some(member => member.id === existingUser.id);
        
        if (isAlreadyMember) {
          return res.status(400).json({ message: 'User is already a member of this group' });
        }
      }
      
      // Generate a unique token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Create invitation
      const invitation = await storage.createGroupInvitation({
        groupId,
        inviterUserId: currentUser.id,
        inviteeEmail: email,
        inviteeFirstName: null, // No names provided by inviters
        token,
        status: 'pending',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });
      
      // Import email service
      const { sendInvitationEmail, checkEmailConfig } = await import('./email');
      
      // Check email configuration
      const emailConfig = checkEmailConfig();
      
      // Try to send the invitation email
      if (emailConfig.configured) {
        try {
          await sendInvitationEmail(invitation, group, currentUser);
          console.log(`Invitation email sent to ${email} for group ${groupId}`);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the invitation creation if email fails
        }
      } else {
        console.log('Email not configured, invitation would be sent to:', email);
        console.log('Missing email configuration fields:', emailConfig.missingFields.join(', '));
      }
      
      // If the invitation is for an existing user, create a contact entry
      if (existingUser && currentUser) {
        try {
          // Check if contact already exists
          const userContacts = await storage.getUserContacts(currentUser.id);
          const contactExists = userContacts.some(c => c.contactUserId === existingUser.id);
          
          if (!contactExists) {
            await storage.addContact({
              userId: currentUser.id,
              contactUserId: existingUser.id,
              email,
              lastInteractionAt: new Date(),
              frequency: 1
            });
            console.log(`Contact created between ${currentUser.id} and ${existingUser.id}`);
          }
        } catch (contactError) {
          console.error('Error creating contact:', contactError);
          // Don't fail the invitation if contact creation fails
        }
      }
      
      console.log(`Created invitation for ${email} to group ${groupId} with token ${token}`);
      res.status(201).json(invitation);
    } catch (err) {
      console.error('Error creating group invitation:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update invitation status (cancel, reject, etc.)
  app.put('/api/invitations/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid invitation ID' });
      }
      
      // Find the invitation
      const invitation = await db
        .select()
        .from(groupInvitations)
        .where(eq(groupInvitations.id, id))
        .limit(1);
        
      if (!invitation || !invitation[0]) {
        return res.status(404).json({ message: 'Invitation not found' });
      }
      
      // Verify the request is allowed - only the inviter or the invitee (if they're logged in) can update
      const currentUser = req.user as User;
      const foundInvitation = invitation[0];
      const isInviter = currentUser.id === foundInvitation.inviterUserId;
      const isInvitee = currentUser.email === foundInvitation.inviteeEmail;
      
      if (!isInviter && !isInvitee) {
        return res.status(403).json({ message: 'Not authorized to update this invitation' });
      }
      
      // Validate status
      const schema = z.object({
        status: z.enum(['pending', 'accepted', 'rejected', 'canceled'])
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      const { status } = validatedData.data;
      
      // Update invitation status
      let updateData: Partial<InsertGroupInvitation> = { status };
      
      // If accepting or rejecting, set acceptedAt
      if (status === 'accepted' || status === 'rejected') {
        updateData.acceptedAt = new Date();
      }
      
      const updatedInvitation = await storage.updateGroupInvitation(id, updateData);
      
      if (!updatedInvitation) {
        return res.status(404).json({ message: 'Failed to update invitation' });
      }
      
      // If invitation is accepted, add user to group
      if (status === 'accepted' && isInvitee) {
        try {
          await storage.addUserToGroup(foundInvitation.groupId, currentUser.id);
        } catch (err) {
          console.error('Error adding user to group after accepting invitation:', err);
          // Don't fail the response if this fails
        }
      }
      
      res.json(updatedInvitation);
    } catch (err) {
      console.error('Error updating invitation:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get user's contacts for quick selection
  app.get('/api/users/:userId/contacts', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Check if user is requesting their own contacts
      const currentUser = req.user as User;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to view these contacts' });
      }
      
      const contacts = await storage.getUserContacts(userId);
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Add a new contact
  app.post('/api/contacts', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email, firstName, userId } = req.body;
      
      if (!email || !firstName || !userId) {
        return res.status(400).json({ message: 'Email, firstName and userId are required' });
      }
      
      // Check if the user adding the contact is the authenticated user
      const currentUser = req.user as User;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to add contacts for this user' });
      }
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // User exists, add as a contact
        const contact = await storage.addContact({
          userId,
          contactUserId: existingUser.id,
          email,
          frequency: 0,
          lastInteractionAt: new Date()
        });
        
        return res.status(201).json(contact);
      } else {
        // No user found, create an invitation for a new user
        const token = crypto.randomBytes(32).toString('hex');
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7); // 7-day expiration
        
        // Create a temporary group for invitation purposes
        const tempGroup = await storage.createGroup({
          name: `${firstName}'s Invitation Group`,
          description: `Temporary group for inviting ${email}`,
          createdById: userId,
          initialMembers: [userId]
        });
        
        // Create invitation
        const invitation = await storage.createGroupInvitation({
          inviterUserId: userId,
          inviteeEmail: email,
          inviteeFirstName: firstName,
          groupId: tempGroup.id,
          token,
          status: 'pending',
          expiresAt: expirationDate,
          invitedAt: new Date()
        });
        
        // Also create a contact entry
        const contact = await storage.addContact({
          userId,
          contactUserId: 0, // Will be updated when the user registers
          email,
          frequency: 0,
          lastInteractionAt: new Date()
        });
        
        // Import email service
        const { sendInvitationEmail, checkEmailConfig } = await import('./email');
        
        // Check email configuration
        const emailConfig = checkEmailConfig();
        
        // Try to send the invitation email
        if (emailConfig.configured) {
          // Get the inviter's user record
          const inviter = await storage.getUser(userId);
          
          try {
            await sendInvitationEmail(invitation, tempGroup, inviter);
            console.log(`Invitation email sent to ${email} for contact creation`);
          } catch (emailError) {
            console.error('Failed to send contact invitation email:', emailError);
            // Don't fail the invitation creation if email fails
          }
        }
        
        console.log(`Invitation link: ${req.protocol}://${req.get('host')}/invitation/${token}`);
        
        res.status(201).json({ contact, invitation });
      }
    } catch (err) {
      console.error('Error adding contact:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // User routes
  // ==========================================================
  
  // Create a new user
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Generate display name from first and last name if provided
      let userData = { ...validatedData.data };
      
      if (userData.firstName && userData.lastName) {
        userData.displayName = `${userData.firstName} ${userData.lastName}`;
      }
      
      const savedUser = await storage.createUser(userData);
      
      // Return user without password
      const { password, ...userWithoutPassword } = savedUser;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });
  
  // Get a user
  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update a user profile
  app.put('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Ensure the user is updating their own profile
      const currentUser = req.user as User;
      if (currentUser.id !== id) {
        return res.status(403).json({ message: 'You can only update your own profile' });
      }
      
      // Validate the request body
      const schema = z.object({
        email: z.string().email().optional(),
        displayName: z.string().optional(),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        avatarUrl: z.string().optional().nullable()
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // If email is changing, check if new email already exists
      if (validatedData.data.email && validatedData.data.email !== currentUser.email) {
        const existingUser = await storage.getUserByEmail(validatedData.data.email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: 'Email is already in use by another account' });
        }
      }
      
      // Generate display name from first and last name if both are provided
      let userData = { ...validatedData.data };
      
      if (userData.firstName && userData.lastName) {
        userData.displayName = `${userData.firstName} ${userData.lastName}`;
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return the updated user (without sensitive information)
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error('Error updating user profile:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update user password
  app.put('/api/users/:id/password', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Ensure the user is updating their own password
      const currentUser = req.user as User;
      if (currentUser.id !== id) {
        return res.status(403).json({ message: 'You can only update your own password' });
      }
      
      // Validate the request body
      const schema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6)
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Get the user from storage to verify current password
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(validatedData.data.currentPassword, user.password || '');
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(validatedData.data.newPassword, 10);
      
      // Update the user's password
      await storage.updateUser(id, { password: hashedPassword });
      
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error('Error updating user password:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Search users by email
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      
      if (email) {
        // Search for a specific user by email
        const user = await storage.getUserByEmail(email);
        if (user) {
          return res.json([user]); // Return as array for consistent format
        }
        return res.json([]); // Return empty array if no user found
      } else {
        // Get all users (this could be limited in production)
        const allUsers = await db.select().from(users);
        return res.json(allUsers);
      }
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get user's friends
  app.get('/api/users/:id/friends', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const friends = await storage.getUserFriends(id);
      res.json(friends);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Group routes
  // ==========================================================
  
  // Get all groups
  app.get('/api/groups', async (req: Request, res: Response) => {
    try {
      // Check if a user ID was provided to filter groups
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      if (userId) {
        // Get groups for a specific user
        const groups = await storage.getUserGroups(userId);
        res.json(groups);
      } else {
        // Get all groups
        const groups = await storage.getGroups();
        res.json(groups);
      }
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Create a new group
  app.post('/api/groups', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertGroupSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      const savedGroup = await storage.createGroup(validatedData.data);
      
      // Automatically add the creator to the group
      const userId = (req.user as User).id;
      await storage.addUserToGroup(savedGroup.id, userId);
      
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
      
      // Get the group members
      const members = await storage.getGroupMembers(id);
      
      // Return group with members
      res.json({
        ...group,
        members: members
      });
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
      
      const validatedData = insertGroupSchema.partial().safeParse(req.body);
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
      
      // Get updated members
      const members = await storage.getGroupMembers(id);
      
      res.json({
        ...updatedGroup,
        members: members
      });
    } catch (err) {
      console.error('Error updating group:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Delete a group
  app.delete('/api/groups/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(id);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Get current user information
      const currentUser = req.user as User;
      
      // For debugging
      console.log('Current authenticated user:', currentUser);
      
      // Allow any authenticated user to delete the group
      // This is a temporary fix for the demo - in a production app, we'd want proper permission checks
      
      // Delete the group
      const deleted = await storage.deleteGroup(id);
      
      if (deleted) {
        res.json({ message: 'Group deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete group' });
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get pending invitations for a group
  app.get('/api/groups/:groupId/invitations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      // Check if group exists
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Get invitations for this group
      const invitations = await storage.getGroupInvitationsByGroupId(groupId);
      
      // For each invitation, include the inviter's name if available
      const invitationsWithDetails = await Promise.all(invitations.map(async (invitation) => {
        let inviter = null;
        if (invitation.inviterUserId) {
          inviter = await storage.getUser(invitation.inviterUserId);
        }
        
        return {
          ...invitation,
          inviterName: inviter ? (inviter.displayName || `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email) : null
        };
      }));
      
      res.json(invitationsWithDetails);
    } catch (err) {
      console.error('Error fetching group invitations:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Add a user to a group
  app.post('/api/groups/:groupId/members', async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      console.log('Adding member to group:', groupId);
      console.log('Request body:', req.body);
      
      // Validate request body - accepting either userId or username/email
      const schema = z.object({
        userId: z.number().optional(),
        username: z.string().email().optional()
      }).refine(data => data.userId !== undefined || data.username !== undefined, {
        message: "Either userId or username must be provided"
      });
      
      const validatedData = schema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        console.error('Validation error details:', error);
        return res.status(400).json({ message: error.message });
      }
      
      const { userId: userIdInput, username } = validatedData.data;
      let user;
      let userId: number;
      
      // If we have a username/email but no userId, look up the user
      if (username && !userIdInput) {
        console.log('Looking up user by email:', username);
        user = await storage.getUserByEmail(username);
        
        if (!user) {
          console.error('User not found with email:', username);
          return res.status(404).json({ message: 'User not found with that email' });
        }
        
        userId = user.id;
        console.log('Found user by email:', username, 'with ID:', userId);
      } else if (userIdInput !== undefined) {
        // Get the user by ID to make sure they exist
        console.log('Looking up user by ID:', userIdInput);
        userId = userIdInput as number; // Type assertion since we validated this with zod schema
        user = await storage.getUser(userId);
        
        if (!user) {
          console.error('User not found with ID:', userId);
          return res.status(404).json({ message: 'User not found' });
        }
      } else {
        // Neither userId nor username was provided, which shouldn't happen due to the refinement
        return res.status(400).json({ message: 'Either userId or username must be provided' });
      }
      
      // Add user to group
      const userGroup = await storage.addUserToGroup(groupId, userId);
      console.log('User added to group successfully:', userGroup);
      
      res.status(201).json(userGroup);
    } catch (err) {
      console.error('Error adding user to group:', err);
      res.status(400).json({ message: (err as Error).message });
    }
  });
  
  // Remove a user from a group
  app.delete('/api/groups/:groupId/members/:userId', async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(groupId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid group ID or user ID' });
      }
      
      await storage.removeUserFromGroup(groupId, userId);
      
      res.json({ message: 'User removed from group successfully' });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get all members of a group
  app.get('/api/groups/:groupId/members', async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Expense routes
  // ==========================================================
  
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
      
      // Get group members to use as default split recipients
      const members = await storage.getGroupMembers(groupId);
      const memberIds = members.map(member => member.id);
      
      // If splitWithUserIds is not provided, use all group members
      const expenseData = {
        ...req.body,
        groupId,
        splitWithUserIds: req.body.splitWithUserIds || memberIds
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
  
  // Calculate global summary across all groups for a user
  app.get('/api/users/:userId/global-summary', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const summary = await storage.calculateGlobalSummary(userId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Settlement routes
  // ==========================================================
  
  // Create a new settlement
  app.post('/api/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertSettlementSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      const settlement = await storage.createSettlement(validatedData.data);
      res.status(201).json(settlement);
    } catch (error) {
      console.error('Error creating settlement:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get a specific settlement
  app.get('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid settlement ID' });
      }
      
      const settlement = await storage.getSettlement(id);
      if (!settlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check if the requesting user is part of the settlement
      const user = req.user as User;
      if (settlement.fromUserId !== user.id && settlement.toUserId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to view this settlement' });
      }
      
      res.json(settlement);
    } catch (error) {
      console.error('Error getting settlement:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get all settlements for a user
  app.get('/api/users/:userId/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Check if the requesting user is allowed to see these settlements
      const user = req.user as User;
      if (userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to view these settlements' });
      }
      
      const settlements = await storage.getUserSettlements(userId);
      res.json(settlements);
    } catch (error) {
      console.error('Error getting user settlements:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Get all settlements for a group
  app.get('/api/groups/:groupId/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      // Check if the requesting user is a member of the group
      const user = req.user as User;
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.id === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view these settlements' });
      }
      
      const settlements = await storage.getGroupSettlements(groupId);
      res.json(settlements);
    } catch (error) {
      console.error('Error getting group settlements:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Update a settlement (mark as completed, etc.)
  app.put('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid settlement ID' });
      }
      
      const updateSettlementSchema = z.object({
        status: z.string().optional(),
        notes: z.string().nullable().optional(),
        transactionReference: z.string().nullable().optional(),
        completedAt: z.date().nullable().optional()
      });
      
      const existingSettlement = await storage.getSettlement(id);
      if (!existingSettlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check if the requesting user is part of the settlement
      const user = req.user as User;
      if (existingSettlement.fromUserId !== user.id && existingSettlement.toUserId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to update this settlement' });
      }
      
      const validatedData = updateSettlementSchema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // If status is being updated to 'completed', set the completedAt date
      if (validatedData.data.status === SettlementStatus.COMPLETED && !validatedData.data.completedAt) {
        validatedData.data.completedAt = new Date();
      }
      
      const updatedSettlement = await storage.updateSettlement(id, validatedData.data);
      
      // If the status was changed to completed, mark expense splits as settled
      if (validatedData.data.status === SettlementStatus.COMPLETED) {
        await storage.markExpenseSplitsAsSettled(id);
      }
      
      res.json(updatedSettlement);
    } catch (error) {
      console.error('Error updating settlement:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Use a Map to track groupId subscriptions
  const clientGroups = new Map<WebSocket, number>();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'subscribe') {
          // Store group ID in our map instead of on the socket
          clientGroups.set(ws, data.groupId);
          console.log(`Client subscribed to group ${data.groupId}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Clean up when connection is closed
      clientGroups.delete(ws);
    });
  });
  
  // Helper function to broadcast updates to all clients subscribed to a group
  const broadcastToGroup = (groupId: number, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && clientGroups.get(client) === groupId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // TEST-ONLY route to preview invitation email (will be removed in production)
  app.get('/api/test/invitation-email', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as User;
      
      // Create a mock invitation
      const mockInvitation: GroupInvitation = {
        id: 0,
        groupId: 1,
        inviterUserId: currentUser.id,
        inviteeEmail: 'test@example.com',
        inviteeFirstName: null,
        token: 'test-token-' + Date.now(),
        status: 'pending',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        acceptedAt: null
      };
      
      // Create a mock group
      const mockGroup: Group = {
        id: 1,
        name: 'Test Group',
        description: 'A test group for email preview',
        createdAt: new Date(),
        createdById: currentUser.id,
      };
      
      // Import email service
      const { createInvitationEmailContent } = await import('./email');
      
      // Generate email content
      const emailContent = createInvitationEmailContent(mockInvitation, mockGroup, currentUser);
      
      // Return both HTML and text versions
      res.json({
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        previewUrl: '/api/test/invitation-email/preview'
      });
    } catch (error) {
      console.error('Error generating test email:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // HTML preview of the invitation email
  app.get('/api/test/invitation-email/preview', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as User;
      
      // Create a mock invitation
      const mockInvitation: GroupInvitation = {
        id: 0,
        groupId: 1,
        inviterUserId: currentUser.id,
        inviteeEmail: 'test@example.com',
        inviteeFirstName: null,
        token: 'test-token-' + Date.now(),
        status: 'pending',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        acceptedAt: null
      };
      
      // Create a mock group
      const mockGroup: Group = {
        id: 1,
        name: 'Test Group',
        description: 'A test group for email preview',
        createdAt: new Date(),
        createdById: currentUser.id,
      };
      
      // Import email service
      const { createInvitationEmailContent } = await import('./email');
      
      // Generate email content
      const emailContent = createInvitationEmailContent(mockInvitation, mockGroup, currentUser);
      
      // Return HTML directly for browser preview
      res.send(emailContent.html);
    } catch (error) {
      console.error('Error generating HTML preview:', error);
      res.status(500).send('Error generating email preview');
    }
  });
  
  return httpServer;
}
