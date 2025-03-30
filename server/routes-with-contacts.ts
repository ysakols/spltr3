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
import passport, { isAuthenticated } from "./auth";
import crypto from "crypto";
import bcrypt from "bcrypt";

// Helper function to sanitize user objects by removing sensitive data
export function sanitizeUser(user: User) {
  if (!user) return null;
  // Destructure to remove password and other sensitive fields
  const { password, googleAccessToken, googleRefreshToken, ...userWithoutSensitiveData } = user;
  return userWithoutSensitiveData;
}

// Helper function to sanitize an array of users
export function sanitizeUsers(users: User[]) {
  return users.map(sanitizeUser);
}

// Helper function to process pending invitations for a newly registered user
async function processPendingInvitations(userId: number, email: string): Promise<void> {
  try {
    // Find all pending invitations for this email
    const pendingInvitations = await storage.getGroupInvitationsByEmail(email);
    
    if (pendingInvitations.length === 0) {
      return;
    }
    
    console.log(`Found ${pendingInvitations.length} pending invitations for ${email}`);
    
    // Process each invitation
    for (const invitation of pendingInvitations) {
      if (invitation.status === 'pending') {
        try {
          // Add user to the group
          await storage.addUserToGroup(invitation.groupId, userId);
          
          // Mark invitation as accepted
          await storage.updateGroupInvitation(invitation.id, {
            status: 'accepted',
            acceptedAt: new Date()
          });
          
          console.log(`Auto-accepted invitation ${invitation.id} for user ${userId} to group ${invitation.groupId}`);
        } catch (err) {
          console.error(`Failed to process invitation ${invitation.id}:`, err);
          // Continue with other invitations even if one fails
        }
      }
    }
  } catch (err) {
    console.error('Error processing pending invitations:', err);
    // Don't throw, let the registration complete even if this fails
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  // ==========================================================
  
  // Get current authenticated user
  app.get('/api/auth/me', isAuthenticated, (req: Request, res: Response) => {
    // Return user without sensitive information
    res.json(sanitizeUser(req.user as User));
  });
  
  // Local login route - also handles registration if user doesn't exist
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
      let user = await storage.getUserByEmail(email);
      
      // If user doesn't exist, create a new account (auto-registration)
      if (!user) {
        try {
          // Generate a username from the email
          const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
          
          // Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);
          
          // Create the user
          const displayName = email.split('@')[0];
          user = await storage.createUser({
            email,
            password: hashedPassword,
            username,
            displayName,
            firstName: null,
            lastName: null
          });
          
          console.log(`Created new user account for ${email}`);
          
          // Process any pending invitations for this email
          await processPendingInvitations(user.id, email);
        } catch (registrationError) {
          console.error('Error creating user account:', registrationError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create user account'
          });
        }
      } else {
        // User exists, verify password
        let isPasswordValid = false;
        
        if (user.password && user.password.startsWith('$2')) {
          // This is a bcrypt hash, use proper comparison
          isPasswordValid = await bcrypt.compare(password, user.password);
        } else {
          // Fall back to direct comparison for backward compatibility
          // This is for existing accounts in the dev environment
          isPasswordValid = user.password === password;
          
          // Upgrade to bcrypt if plain password was used
          if (isPasswordValid) {
            try {
              const hashedPassword = await bcrypt.hash(password, 10);
              await storage.updateUser(user.id, { password: hashedPassword });
              console.log(`Upgraded password hash for user ${user.id}`);
            } catch (err) {
              console.error('Failed to upgrade password hash:', err);
              // Don't fail the login if this fails
            }
          }
        }
        
        if (!isPasswordValid) {
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid email or password' 
          });
        }
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            message: 'Error during login' 
          });
        }
        
        // Return sanitized user without sensitive information
        return res.json({ 
          success: true, 
          user: sanitizeUser(user)
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
      // Clear the session
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        // Redirect to login page instead of home to ensure authentication check
        res.redirect('/login');
      });
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
      
      // Log invitation details for debugging
      console.log(`Invitation sent to ${email} with token: ${token}`);
      
      // Extract the base URL for logging purposes only
      let baseUrl = process.env.APP_URL;
      if (!baseUrl && process.env.REPL_ID) {
        baseUrl = `https://${process.env.REPL_ID}.replit.app`;
      }
      if (!baseUrl) {
        baseUrl = 'http://localhost:5000';
      }
      console.log(`Invitation link: ${baseUrl}/invitation/${token}`);
      
      // Try to send the invitation email
      if (emailConfig.configured) {
        try {
          const emailSent = await sendInvitationEmail(invitation, group, currentUser);
          if (emailSent) {
            console.log(`Invitation email sent to ${email} for group ${groupId}`);
          } else {
            console.log(`Failed to send email to ${email} but invitation was created`);
          }
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
  
  // Resend invitation email
  app.post('/api/invitations/:id/resend', isAuthenticated, async (req: Request, res: Response) => {
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
      
      const foundInvitation = invitation[0];
      
      // Security check: Only the inviter can resend the email
      const currentUser = req.user as User;
      if (foundInvitation.inviterUserId !== currentUser.id) {
        return res.status(403).json({ message: 'Only the inviter can resend an invitation' });
      }
      
      // Get the group for the email content
      const group = await storage.getGroup(foundInvitation.groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Import email service
      const { sendInvitationEmail, checkEmailConfig } = await import('./email');
      
      // Check email configuration
      const emailConfig = checkEmailConfig();
      if (!emailConfig.configured) {
        return res.status(500).json({ 
          message: 'Email service is not configured properly',
          details: emailConfig
        });
      }
      
      // Send the invitation email
      try {
        const emailSent = await sendInvitationEmail(foundInvitation, group, currentUser);
        if (emailSent) {
          console.log(`Invitation email resent to ${foundInvitation.inviteeEmail} successfully`);
          res.json({ success: true, message: 'Invitation email sent successfully' });
        } else {
          console.error(`Failed to resend invitation email to ${foundInvitation.inviteeEmail}`);
          res.status(500).json({ message: 'Failed to send invitation email' });
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        res.status(500).json({ message: 'Error sending email', error: (emailError as Error).message });
      }
    } catch (err) {
      console.error('Error resending invitation:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get users that share groups with the requesting user
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
      
      // Get all pending invitations sent by this user
      const pendingInvitations = await storage.getGroupInvitationsByInviterUserId(userId);
      
      // Get all group members from groups the user belongs to (excluding self)
      const userGroups = await storage.getUserGroups(userId);
      console.log(`User ${userId} belongs to ${userGroups.length} groups`);
      
      // Create a collection of group members (excluding self, with no duplicates)
      const groupMembers: {user: User, groupId: number}[] = [];
      const seenMemberIds = new Set<number>();
      
      for (const group of userGroups) {
        const members = await storage.getGroupMembers(group.id);
        
        for (const member of members) {
          // Skip self and already added members
          if (member.id !== userId && !seenMemberIds.has(member.id)) {
            seenMemberIds.add(member.id);
            groupMembers.push({user: member, groupId: group.id});
          }
        }
      }
      
      // Create a map for members and invitations
      const contactMap = new Map();
      
      // Add group members to the map
      for (const {user, groupId} of groupMembers) {
        // Create or update the member's groupIds
        if (contactMap.has(user.id)) {
          const existing = contactMap.get(user.id);
          if (!existing.groupIds.includes(groupId)) {
            existing.groupIds.push(groupId);
          }
        } else {
          contactMap.set(user.id, {
            id: user.id,
            email: user.email || '',
            isUser: true,
            groupIds: [groupId],
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          });
        }
      }

      // Add pending invitations to the map
      for (const invitation of pendingInvitations) {
        // Using invitation ID as key for invitations
        const key = `inv_${invitation.id}`;
        
        contactMap.set(key, {
          id: key,
          invitationId: invitation.id,
          email: invitation.inviteeEmail,
          isUser: false,
          groupIds: [invitation.groupId],
          firstName: invitation.inviteeFirstName,
          status: invitation.status,
          token: invitation.token,
          displayName: invitation.inviteeFirstName || invitation.inviteeEmail
        });
      }

      // Convert map back to array
      const contacts = Array.from(contactMap.values());
      
      // Process each contact to add a balanceValue, showing how much is owed
      const globalSummary = await storage.calculateGlobalSummary(userId);
      const withBalances = contacts.map(contact => {
        const balance = 
          (contact.isUser && contact.id && typeof contact.id === 'number') ? 
          globalSummary.balances[contact.id] || 0 : 
          0;
          
        return {
          ...contact,
          balanceValue: balance
        };
      });
      
      res.json(withBalances);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // We no longer support direct contact deletion
  // The relationship between users is now determined by shared group membership
  
  // Get connection details with shared groups and balance
  app.get('/api/users/:userId/contacts/:contactUserId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const contactUserId = parseInt(req.params.contactUserId);
      
      if (isNaN(userId) || isNaN(contactUserId)) {
        return res.status(400).json({ message: 'Invalid user ID or contact user ID' });
      }
      
      // Check auth - only users can view their own contacts
      const currentUser = req.user as User;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this contact' });
      }
      
      // Get the contact user
      const contactUser = await storage.getUser(contactUserId);
      if (!contactUser) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      
      // Get all groups where both users are members
      const userGroups = await storage.getUserGroups(userId);
      const contactGroups = await storage.getUserGroups(contactUserId);
      
      // Find shared groups by comparing IDs
      const sharedGroupIds = userGroups
        .filter(group => contactGroups.some(cGroup => cGroup.id === group.id))
        .map(group => group.id);
      
      // Ensure users share at least one group (for security)
      if (sharedGroupIds.length === 0) {
        return res.status(403).json({ message: 'You do not share any groups with this user' });
      }
      
      // Get detailed information for each shared group
      const sharedGroups = [];
      for (const groupId of sharedGroupIds) {
        const group = await storage.getGroup(groupId);
        if (group) {
          // Get group-specific balance for these two users
          const groupSummary = await storage.calculateSummary(groupId);
          const balanceInGroup = (groupSummary.balances[contactUserId] || 0) * -1; // Invert for current user's perspective
          
          // Add expenses for context
          const groupExpenses = await storage.getExpenses(groupId);
          
          sharedGroups.push({
            ...group,
            balance: balanceInGroup,
            expenses: groupExpenses,
            totalExpenses: groupSummary.totalExpenses
          });
        }
      }
      
      // Get global balance between these two users
      const globalSummary = await storage.calculateGlobalSummary(userId);
      const globalBalance = (globalSummary.balances[contactUserId] || 0) * -1; // Invert for current user's perspective
      
      res.json({
        contact: {
          id: contactUserId,
          email: contactUser.email,
          firstName: contactUser.firstName,
          lastName: contactUser.lastName,
          displayName: contactUser.displayName || `${contactUser.firstName || ''} ${contactUser.lastName || ''}`.trim() || contactUser.email,
          groupIds: sharedGroupIds
        },
        sharedGroups,
        globalBalance
      });
      
    } catch (error) {
      console.error('Error getting contact details:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Invite a new user to a group
  app.post('/api/contacts', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email, userId, groupId, firstName } = req.body;
      
      if (!email || !userId) {
        return res.status(400).json({ message: 'Email and userId are required' });
      }
      
      // Check if the user adding the contact is the authenticated user
      const currentUser = req.user as User;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'Not authorized to send invitations for this user' });
      }
      
      // Generate token for the invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // 7-day expiration
      
      // Use specified group or create a new one
      let group;
      if (groupId) {
        // Verify user is a member of the specified group
        group = await storage.getGroup(groupId);
        if (!group) {
          return res.status(404).json({ message: 'Group not found' });
        }
        
        // Verify user is a member of this group
        const members = await storage.getGroupMembers(groupId);
        const isMember = members.some(member => member.id === userId);
        if (!isMember) {
          return res.status(403).json({ message: 'You are not a member of this group' });
        }
      } else {
        // Create a temporary group for invitation purposes
        group = await storage.createGroup({
          name: `Invitation Group`,
          description: `Group for inviting ${email}`,
          createdById: userId,
          initialMembers: [userId]
        });
      }
      
      // Create invitation
      const invitation = await storage.createGroupInvitation({
        inviterUserId: userId,
        inviteeEmail: email,
        inviteeFirstName: firstName || null,
        groupId: group.id,
        token,
        status: 'pending',
        expiresAt: expirationDate,
        invitedAt: new Date()
      });
      
      // Import email service
      const { sendInvitationEmail, checkEmailConfig } = await import('./email');
      
      // Check email configuration
      const emailConfig = checkEmailConfig();
      
      // Log invitation details for debugging
      console.log(`Invitation sent to ${email} with token: ${token}`);
      
      // Extract the base URL for the invitation link
      let baseUrl = process.env.APP_URL;
      if (!baseUrl && process.env.REPL_ID) {
        baseUrl = `https://${process.env.REPL_ID}.replit.app`;
      }
      if (!baseUrl) {
        baseUrl = `${req.protocol}://${req.get('host')}`;
      }
      const invitationLink = `${baseUrl}/invitation/${token}`;
      console.log(`Invitation link: ${invitationLink}`);
      
      // Try to send the invitation email
      if (emailConfig.configured) {
        // Get the inviter's user record
        const inviter = await storage.getUser(userId);
        
        try {
          const emailSent = await sendInvitationEmail(invitation, group, inviter);
          if (emailSent) {
            console.log(`Invitation email sent to ${email} successfully`);
          } else {
            console.log(`Failed to send invitation email to ${email} but invitation was created`);
          }
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Don't fail the invitation creation if email fails
        }
      }
      
      res.status(201).json({ 
        success: true, 
        invitation,
        invitationLink
      });
    } catch (err) {
      console.error('Error creating invitation:', err);
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
      
      // Hash the password
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
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
  app.get('/api/users/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      // Return sanitized user without password
      res.json(sanitizeUser(user));
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
  app.get('/api/users', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const email = req.query.email as string;
      
      if (email) {
        // Search for a specific user by email
        const user = await storage.getUserByEmail(email);
        if (user) {
          return res.json([sanitizeUser(user)]); // Return as array for consistent format with sanitized data
        }
        return res.json([]); // Return empty array if no user found
      } else {
        // Get all users (this could be limited in production)
        const allUsers = await db.select().from(users);
        return res.json(sanitizeUsers(allUsers)); // Sanitize all users before returning
      }
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get user's friends
  app.get('/api/users/:id/friends', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const friends = await storage.getUserFriends(id);
      res.json(sanitizeUsers(friends));
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Group routes
  // ==========================================================
  
  // Get all groups
  app.get('/api/groups', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the authenticated user
      const currentUser = req.user as User;
      
      // Check if a user ID was provided to filter groups
      const userId = req.query.userId ? parseInt(req.query.userId as string) : currentUser.id;
      
      // Security check: Users can only see their own groups
      if (userId !== currentUser.id) {
        return res.status(403).json({ message: 'Not authorized to view these groups' });
      }
      
      let groups = [];
      // Get groups for the authenticated user only
      groups = await storage.getUserGroups(userId);
      
      // Fetch creator information for each group and sanitize
      const groupsWithCreatorInfo = await Promise.all(groups.map(async (group) => {
        if (group.createdById) {
          const creator = await storage.getUser(group.createdById);
          return {
            ...group,
            creatorInfo: creator ? sanitizeUser(creator) : undefined
          };
        }
        return group;
      }));
      
      res.json(groupsWithCreatorInfo);
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
  app.get('/api/groups/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(id);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      
      // Get the group members
      const members = await storage.getGroupMembers(id);
      
      // Ensure the current user is a member of this group
      const currentUser = req.user as User;
      const isMember = members.some(member => member.id === currentUser.id);
      
      // If not a member, check if user has a pending invitation to this group
      if (!isMember) {
        // Get invitations for this user's email
        const invitations = await storage.getGroupInvitationsByEmail(currentUser.email);
        const hasPendingInvitation = invitations.some(
          inv => inv.groupId === id && inv.status === 'pending'
        );
        
        if (hasPendingInvitation) {
          // Allow limited access to users with pending invitations
          return res.json({
            id: group.id,
            name: group.name,
            description: group.description,
            createdById: group.createdById,
            hasPendingInvitation: true,
            isGroupMember: false,
            memberCount: members.length
          });
        }
        
        // Not a member and no pending invitation, deny access
        return res.status(403).json({ 
          message: 'You are not a member of this group',
          note: 'You need an invitation to access this group'
        });
      }
      
      // Get the creator information
      let creatorInfo = undefined;
      if (group.createdById) {
        const creator = await storage.getUser(group.createdById);
        if (creator) {
          creatorInfo = sanitizeUser(creator);
        }
      }
      
      // Return group with sanitized members and creator info
      res.json({
        ...group,
        members: sanitizeUsers(members),
        creatorInfo: creatorInfo,
        isGroupMember: true,
        isGroupCreator: currentUser.id === group.createdById
      });
    } catch (err) {
      console.error('Error getting group details:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update a group (only creator can update)
  app.put('/api/groups/:id', isAuthenticated, async (req: Request, res: Response) => {
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
      
      // Get current user information
      const currentUser = req.user as User;
      
      // First check if the user is the creator of the group
      if (group.createdById !== currentUser.id) {
        return res.status(403).json({ 
          message: 'Only the group creator can edit the group',
          note: 'Group details can only be modified by the creator'
        });
      }
      
      // Second, check if the user is actually a member of the group
      const members = await storage.getGroupMembers(id);
      const isMember = members.some(member => member.id === currentUser.id);
      
      if (!isMember) {
        return res.status(403).json({ 
          message: 'You are not a member of this group and cannot edit it',
          note: 'You need to be both the creator and a member to edit a group'
        });
      }
      
      console.log('Updating group with data:', validatedData.data);
      const updatedGroup = await storage.updateGroup(id, validatedData.data);
      console.log('Group updated successfully:', updatedGroup);
      
      if (!updatedGroup) {
        return res.status(500).json({ message: 'Failed to update group' });
      }
      
      // Get updated members
      const updatedMembers = await storage.getGroupMembers(id);
      
      // Get creator information
      let creatorInfo = undefined;
      if (updatedGroup.createdById) {
        const creator = await storage.getUser(updatedGroup.createdById);
        if (creator) {
          creatorInfo = sanitizeUser(creator);
        }
      }
      
      res.json({
        ...updatedGroup,
        members: sanitizeUsers(updatedMembers),
        creatorInfo: creatorInfo,
        isGroupMember: true,
        isGroupCreator: currentUser.id === updatedGroup.createdById
      });
    } catch (err) {
      console.error('Error updating group:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Delete a group - only the creator can delete a group
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
      
      // First check if the user is the creator of the group
      if (group.createdById !== currentUser.id) {
        return res.status(403).json({ 
          message: 'Only the group creator can delete the group',
          note: 'You can leave the group instead by removing yourself as a member'
        });
      }
      
      // Second, check if the user is actually a member of the group
      const members = await storage.getGroupMembers(id);
      const isMember = members.some(member => member.id === currentUser.id);
      
      if (!isMember) {
        return res.status(403).json({ 
          message: 'You are not a member of this group and cannot delete it',
          note: 'Only group members with creator privileges can delete a group'
        });
      }
      
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
      
      // For each invitation, include the inviter's info if available (sanitized)
      const invitationsWithDetails = await Promise.all(invitations.map(async (invitation) => {
        let inviter = null;
        if (invitation.inviterUserId) {
          const inviterUser = await storage.getUser(invitation.inviterUserId);
          if (inviterUser) {
            inviter = sanitizeUser(inviterUser);
          }
        }
        
        return {
          ...invitation,
          inviter: inviter,
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
  app.post('/api/groups/:groupId/members', isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Remove a user from a group or leave a group
  app.delete('/api/groups/:groupId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const userId = parseInt(req.params.userId);
      const currentUserId = (req.user as User).id;
      
      if (isNaN(groupId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid group ID or user ID' });
      }
      
      // Get the group
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Users can remove themselves (leave the group) or group creators can remove any member
      if (userId === currentUserId) {
        // User is leaving the group (removing themselves)
        // Cannot leave if you're the creator and there are other members
        if (group.createdById === currentUserId) {
          const members = await storage.getGroupMembers(groupId);
          if (members.length > 1) {
            return res.status(400).json({ 
              message: 'As the group creator, you cannot leave the group while other members exist', 
              note: 'You need to either remove all other members first or delete the group'
            });
          }
        }
      } else if (group.createdById !== currentUserId) {
        // User is trying to remove someone else but is not the group creator
        return res.status(403).json({ 
          message: 'Only the group creator can remove other members',
          note: 'Users can only remove themselves from a group'
        });
      }
      
      await storage.removeUserFromGroup(groupId, userId);
      
      // If user is removing themselves, give a different message
      if (userId === currentUserId) {
        res.json({ message: 'You have left the group successfully' });
      } else {
        res.json({ message: 'User removed from group successfully' });
      }
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get all members of a group
  app.get('/api/groups/:groupId/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const members = await storage.getGroupMembers(groupId);
      // Use the sanitizeUsers helper function to remove sensitive data
      res.json(sanitizeUsers(members));
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Expense routes
  // ==========================================================
  
  // Get all expenses for a group
  app.get('/api/groups/:groupId/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const expenses = await storage.getExpenses(groupId);
      
      // Enhance expenses with user information
      const enhancedExpenses = await Promise.all(expenses.map(async (expense) => {
        // Get the user who paid for the expense and sanitize
        const paidByUser = expense.paidByUserId ? await storage.getUser(expense.paidByUserId) : null;
        
        return {
          ...expense,
          paidByUser: paidByUser ? sanitizeUser(paidByUser) : null
        };
      }));
      
      res.json(enhancedExpenses);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Add a new expense
  app.post('/api/groups/:groupId/expenses', isAuthenticated, async (req: Request, res: Response) => {
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
  app.delete('/api/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      const expense = await storage.getExpense(id);
      if (!expense) return res.status(404).json({ message: 'Expense not found' });
      
      const currentUserId = (req.user as User).id;
      
      // Check if the current user is the one who paid for the expense (creator)
      if (expense.paidByUserId !== currentUserId) {
        return res.status(403).json({ message: 'Only the expense creator can delete this expense' });
      }
      
      await storage.deleteExpense(id);
      res.json({ message: 'Expense deleted' });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update an expense
  app.put('/api/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
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
      
      const currentUserId = (req.user as User).id;
      
      // Check if the current user is the one who paid for the expense (creator)
      if (expense.paidByUserId !== currentUserId) {
        return res.status(403).json({ message: 'Only the expense creator can update this expense' });
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
  app.get('/api/groups/:groupId/summary', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: 'Group not found' });
      
      // Ensure the user is a member of the group
      const user = req.user as User;
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.id === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view this group summary' });
      }
      
      const summary = await storage.calculateSummary(groupId);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Calculate global summary across all groups for a user
  app.get('/api/users/:userId/global-summary', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Additional security check to ensure a user can only access their own summary
      const currentUser = req.user as User;
      if (currentUser.id !== userId) {
        return res.status(403).json({ message: 'You are not authorized to view this user\'s summary' });
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
      
      // Sanitize any user data in the settlement
      // The settlement might have user details if it was loaded with joins
      const settlementWithUsers = settlement as any;
      if (settlementWithUsers.fromUserDetails) {
        settlementWithUsers.fromUserDetails = sanitizeUser(settlementWithUsers.fromUserDetails);
      }
      if (settlementWithUsers.toUserDetails) {
        settlementWithUsers.toUserDetails = sanitizeUser(settlementWithUsers.toUserDetails);
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
      
      // Sanitize user details in settlements if they exist
      const sanitizedSettlements = settlements.map(settlement => {
        // Handle potentially extended settlement objects with user details
        const settlementWithUsers = settlement as any;
        if (settlementWithUsers.fromUserDetails) {
          settlementWithUsers.fromUserDetails = sanitizeUser(settlementWithUsers.fromUserDetails);
        }
        if (settlementWithUsers.toUserDetails) {
          settlementWithUsers.toUserDetails = sanitizeUser(settlementWithUsers.toUserDetails);
        }
        return settlement;
      });
      
      res.json(sanitizedSettlements);
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
      
      // Sanitize user details in group settlements if they exist
      const sanitizedSettlements = settlements.map(settlement => {
        // Handle potentially extended settlement objects with user details
        const settlementWithUsers = settlement as any;
        if (settlementWithUsers.fromUserDetails) {
          settlementWithUsers.fromUserDetails = sanitizeUser(settlementWithUsers.fromUserDetails);
        }
        if (settlementWithUsers.toUserDetails) {
          settlementWithUsers.toUserDetails = sanitizeUser(settlementWithUsers.toUserDetails);
        }
        return settlement;
      });
      
      res.json(sanitizedSettlements);
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
      
      // Sanitize any user details in the updated settlement
      const settlementWithUsers = updatedSettlement as any;
      if (settlementWithUsers.fromUserDetails) {
        settlementWithUsers.fromUserDetails = sanitizeUser(settlementWithUsers.fromUserDetails);
      }
      if (settlementWithUsers.toUserDetails) {
        settlementWithUsers.toUserDetails = sanitizeUser(settlementWithUsers.toUserDetails);
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
    // Sanitize any user data before broadcasting
    if (data.user) {
      data.user = sanitizeUser(data.user);
    }
    if (data.users && Array.isArray(data.users)) {
      data.users = sanitizeUsers(data.users);
    }
    if (data.members && Array.isArray(data.members)) {
      data.members = sanitizeUsers(data.members);
    }
    if (data.creatorInfo) {
      data.creatorInfo = sanitizeUser(data.creatorInfo);
    }
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && clientGroups.get(client) === groupId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  // TEST-ONLY route to preview invitation email (will be removed in production)
  app.get('/api/test/invitation-email', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use authenticated user if available, or create a mock user
      const currentUser = req.user as User || {
        id: 999,
        email: 'test-sender@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User'
      };
      
      // Only log sanitized user data
      console.log('Using user for test email:', sanitizeUser(currentUser));
      
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
  
  // Test route to actually send an email using Resend
  app.get('/api/test/invitation-email/send', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use authenticated user if available, or create a mock user
      const currentUser = req.user as User || {
        id: 999,
        email: 'test-sender@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User'
      };
      
      // Only log sanitized user data
      console.log('Using user for test email send:', sanitizeUser(currentUser));
      
      // Create a mock invitation
      const mockInvitation: GroupInvitation = {
        id: 0,
        groupId: 1,
        inviterUserId: currentUser.id,
        inviteeEmail: 'delivered@resend.dev', // Use Resend's test email address for reliable delivery
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
        description: 'A test group for email sending',
        createdAt: new Date(),
        createdById: currentUser.id,
      };
      
      // Import email service
      const { sendInvitationEmail, checkEmailConfig } = await import('./email');
      
      // Check email configuration first
      const emailConfig = checkEmailConfig();
      console.log('Email configuration status:', emailConfig);
      
      // Attempt to send the email
      const success = await sendInvitationEmail(mockInvitation, mockGroup, currentUser);
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Test email sent successfully to ' + mockInvitation.inviteeEmail,
          emailConfig
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send test email',
          emailConfig  
        });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ 
        success: false,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  });
  
  // HTML preview of the invitation email
  app.get('/api/test/invitation-email/preview', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use authenticated user if available, or create a mock user
      const currentUser = req.user as User || {
        id: 999,
        email: 'test-sender@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User'
      };
      
      // Only log sanitized user data
      console.log('Using user for email preview:', sanitizeUser(currentUser));
      
      // Create a mock invitation
      const mockInvitation: GroupInvitation = {
        id: 0,
        groupId: 1,
        inviterUserId: currentUser.id,
        inviteeEmail: 'delivered@resend.dev', // Use Resend's test email address for consistency
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
