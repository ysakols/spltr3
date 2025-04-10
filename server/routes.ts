import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGroupSchema, insertExpenseSchema, insertUserSchema, insertSettlementSchema, 
  insertTransactionSchema, users, User, Group, GroupInvitation, groupInvitations, 
  InsertGroupInvitation, Settlement, Transaction, TransactionType, TransactionStatus,
  PaymentMethod, SettlementStatus
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { db } from "./db";
import passport, { isAuthenticated } from "./auth";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { 
  verifyTransactionConsistency, 
  reconcileTransactionData, 
  findInconsistentTransactions 
} from './transactionVerification';

// Helper function to sanitize user objects by removing sensitive data
export function sanitizeUser(user: User) {
  if (!user) return null;
  
  // Return only the fields that are absolutely necessary
  // This is more secure than removing specific sensitive fields
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    display_name: user.display_name,
    email: user.email,
    username: user.username,
    avatar_url: user.avatar_url,
    // Omit: password, googleId, googleAccessToken, googleRefreshToken, lastLogin, and other sensitive data
  };
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

// Note: This file contains contact-related endpoints that will be removed, including:
// - GET /api/users/:userId/contacts
// - GET /api/users/:userId/contacts/:contactUserId
// - POST /api/contacts
// User connections are now handled only through group memberships

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
      console.log('===== Login attempt =====');
      console.log('Login attempt with email:', req.body.email);
      
      const { email, password } = req.body;
      
      if (!email || !password) {
        console.log('Login failed: Email or password missing');
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }
      
      // Find user by email
      let user = await storage.getUserByEmail(email);
      
      console.log('User lookup result:', user ? { id: user.id, email: user.email } : 'Not found');
      
      // If user doesn't exist, create a new account (auto-registration)
      if (!user) {
        try {
          // Generate a username from the email
          const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
          
          // Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);
          
          // Create the user
          const display_name = email.split('@')[0];
          user = await storage.createUser({
            email,
            password: hashedPassword,
            username,
            display_name,
            first_name: null,
            last_name: null
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
  // Google OAuth login endpoint
  app.get('/auth/google', (req: Request, res: Response, next: NextFunction) => {
    console.log('Google auth route accessed with query params:', req.query);
    
    // Store redirect URL in session
    if (req.query.redirect) {
      req.session.redirectTo = req.query.redirect as string;
      console.log('Stored redirect URL in session:', req.session.redirectTo);
    }
    
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  });

  // Google OAuth callback endpoint
  app.get('/auth/google/callback', 
    (req: Request, res: Response, next: NextFunction) => {
      console.log('===== Google callback route =====');
      console.log('Callback received with query params:', req.query);
      console.log('Session redirect path:', req.session.redirectTo);
      console.log('User authenticated?', req.isAuthenticated());
      
      // Handle errors passed in the OAuth state
      if (req.query.error) {
        console.error('Google auth error:', req.query.error);
        return res.redirect(`/login?error=${encodeURIComponent(req.query.error as string)}`);
      }
      next();
    },
    // Use custom authentication handler for better error reporting
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('google', (err: Error | null, user: any, info: { message: string }) => {
        if (err) {
          console.error('Google authentication error:', err);
          return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
        }
        if (!user) {
          console.error('Google authentication failed:', info);
          return res.redirect('/login?error=Authentication%20failed');
        }
        // Log in the authenticated user
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('Login error after Google auth:', loginErr);
            return res.redirect(`/login?error=${encodeURIComponent(loginErr.message)}`);
          }
          next();
        });
      })(req, res, next);
    },
    (req: Request, res: Response) => {
      console.log('Google authentication successful for user:', (req.user as User)?.email);
      console.log('User is now authenticated:', req.isAuthenticated());
      
      // Use the stored redirect path or default to home
      const redirectPath = req.session.redirectTo || '/';
      console.log('Redirecting to:', redirectPath);
      
      // Clean up session
      delete req.session.redirectTo;
      
      res.redirect(redirectPath);
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
      
      // Check if invitation is already accepted
      if (invitation.status === 'accepted') {
        return res.status(400).json({ 
          message: 'This invitation has already been accepted',
          groupId: invitation.groupId
        });
      }
      
      // If user is logged in and matches the invited email
      if (req.isAuthenticated() && req.user) {
        const user = req.user as User;
        
        // Verify the invitation matches this user's email
        if (user.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) {
          return res.status(403).json({ 
            message: 'This invitation was sent to a different email address',
            invitedEmail: invitation.inviteeEmail 
          });
        }
        
        // Ask for explicit confirmation before adding to group
        return res.json({
          invitation: {
            ...invitation,
            isExpired: expired,
            requiresAuthentication: false,
            requiresConfirmation: true,
            userEmail: user.email,
            groupId: invitation.groupId
          }
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
      console.error('Error processing invitation:', err);
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
        inviteeName: null, // No names provided by inviters
        token,
        status: 'pending',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        resendCount: 0,
        lastResendAt: null
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
      
      // Contact-related code has been removed
      // Users now connect only through group memberships
      
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
  
  // Note: Contact-related endpoints have been removed:
  // - GET /api/users/:userId/contacts
  // - GET /api/users/:userId/contacts/:contactUserId
  // - POST /api/contacts
  // Users now connect only through group memberships
  
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
      
      // Check rate limit - maximum 3 resends in a 24-hour period
      const MAX_RESENDS_PER_DAY = 3;
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      
      // If resendCount >= 3 and the last resend was within 24 hours
      if (foundInvitation.resendCount >= MAX_RESENDS_PER_DAY && 
          foundInvitation.lastResendAt && 
          (Date.now() - foundInvitation.lastResendAt.getTime()) < ONE_DAY_MS) {
        
        // Calculate when the user can try again
        const nextResendTime = new Date(foundInvitation.lastResendAt.getTime() + ONE_DAY_MS);
        const timeRemaining = nextResendTime.getTime() - Date.now();
        const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
        
        return res.status(429).json({ 
          message: `Rate limit exceeded. You can resend this invitation again in ${hoursRemaining} hours.`,
          nextResendTime
        });
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
          // Update the resend counter and timestamp
          const now = new Date();
          
          // Reset counter if 24 hours have passed since last resend
          const newResendCount = foundInvitation.lastResendAt && 
                                (now.getTime() - foundInvitation.lastResendAt.getTime() >= ONE_DAY_MS) 
                                ? 1 : foundInvitation.resendCount + 1;
          
          // Update invitation with new resend count and timestamp
          await db
            .update(groupInvitations)
            .set({
              resendCount: newResendCount,
              lastResendAt: now
            })
            .where(eq(groupInvitations.id, id));
          
          console.log(`Invitation email resent to ${foundInvitation.inviteeEmail} successfully (resend count: ${newResendCount})`);
          res.json({ 
            success: true, 
            message: 'Invitation email sent successfully',
            resendCount: newResendCount,
            resendLimit: MAX_RESENDS_PER_DAY
          });
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
  
  // Registration route - for creating new accounts with first name required
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, first_name, last_name } = req.body;
      
      // Check if required fields are present
      if (!email || !password || !first_name) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email, password, and first name are required' 
        });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }
      
      // Generate a username from the email
      const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create the user with the provided first name
      let display_name = first_name;
      if (last_name) {
        display_name = `${first_name} ${last_name}`;
      }
      
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        username,
        display_name,
        first_name,
        last_name: last_name || null
      });
      
      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in after registration:', err);
          return res.status(500).json({
            success: false,
            message: 'Account created, but failed to log in automatically'
          });
        }
        
        // Return success with user data
        return res.json({
          success: true,
          message: 'Account created successfully',
          user: sanitizeUser(user)
        });
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred during registration' 
      });
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
      
      if (userData.first_name && userData.last_name) {
        userData.display_name = `${userData.first_name} ${userData.last_name}`;
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
        display_name: z.string().optional(),
        first_name: z.string().min(1, "First name is required"),
        last_name: z.string().min(1, "Last name is required"),
        avatar_url: z.string().optional().nullable()
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
      
      if (userData.first_name && userData.last_name) {
        userData.display_name = `${userData.first_name} ${userData.last_name}`;
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
          inviterName: inviter ? (inviter.display_name || `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email) : null
        };
      }));
      
      res.json(invitationsWithDetails);
    } catch (err) {
      console.error('Error fetching group invitations:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Add a user to a group - DEPRECATED: Now redirects to invitation flow
  app.post('/api/groups/:groupId/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      console.log('Redirecting add member request to invitation flow for group:', groupId);
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
      let email = username;
      
      // If we have a userId but no email, look up the user's email
      if (userIdInput !== undefined && !email) {
        const user = await storage.getUser(userIdInput);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        email = user.email;
      }
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required to send an invitation' });
      }
      
      // Check if the user is already a member of the group
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        const members = await storage.getGroupMembers(groupId);
        const isAlreadyMember = members.some(member => member.id === existingUser.id);
        
        if (isAlreadyMember) {
          return res.status(400).json({ message: 'User is already a member of this group' });
        }
      }
      
      // Check if group exists
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Generate a unique token
      const token = crypto.randomBytes(32).toString('hex');
      const currentUser = req.user as User;
      
      // Create invitation
      const invitation = await storage.createGroupInvitation({
        groupId,
        inviterUserId: currentUser.id,
        inviteeEmail: email,
        inviteeName: null,
        token,
        status: 'pending',
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        resendCount: 0,
        lastResendAt: null
      });
      
      // Import email service
      const { sendInvitationEmail, checkEmailConfig } = await import('./email');
      
      // Try to send the invitation email
      let emailSent = false;
      const emailConfig = checkEmailConfig();
      
      if (emailConfig.configured) {
        try {
          emailSent = await sendInvitationEmail(invitation, group, currentUser);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
        }
      }
      
      // Extract the base URL for invitation link
      let baseUrl = process.env.APP_URL;
      if (!baseUrl && process.env.REPL_ID) {
        baseUrl = `https://${process.env.REPL_ID}.replit.app`;
      }
      if (!baseUrl) {
        baseUrl = 'http://localhost:5000';
      }
      const invitationLink = `${baseUrl}/invitation/${token}`;
      
      res.status(201).json({
        message: 'Invitation created and sent',
        invitation,
        emailSent,
        invitationLink
      });
    } catch (err) {
      console.error('Error creating invitation:', err);
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
      
      console.log(`Removing user ${userId} from group ${groupId}`);
      
      try {
        const result = await storage.removeUserFromGroup(groupId, userId);
        console.log(`Successfully removed user ${userId} from group ${groupId}`);
        console.log(`Deleted ${result.deletedExpensesCount} expenses created by user`);
        console.log(`Found ${result.affectedExpensesCount} expenses with orphaned splits`);
        
        // Construct a detailed response message
        let responseMessage = '';
        
        if (userId === currentUserId) {
          responseMessage = 'You have left the group successfully.';
        } else {
          responseMessage = 'User removed from group successfully.';
        }
        
        // Add details about deleted expenses if any
        if (result.deletedExpensesCount > 0) {
          responseMessage += ` ${result.deletedExpensesCount} expense(s) created by this user have been deleted.`;
        }
        
        // Add details about affected expenses if any
        if (result.affectedExpensesCount > 0) {
          responseMessage += ` ${result.affectedExpensesCount} expense(s) need to be re-split because they included this user.`;
          
          // Return the response with additional details
          return res.json({ 
            message: responseMessage,
            deletedExpensesCount: result.deletedExpensesCount,
            affectedExpensesCount: result.affectedExpensesCount,
            affectedExpenses: result.affectedExpenses,
            needsResplit: result.affectedExpensesCount > 0
          });
        }
        
        // Return simple response if no affected expenses
        res.json({ 
          message: responseMessage,
          deletedExpensesCount: result.deletedExpensesCount,
          affectedExpensesCount: 0,
          needsResplit: false
        });
      } catch (error) {
        console.error('Error removing user from group:', error);
        res.status(500).json({ message: `Error removing user: ${(error as Error).message}` });
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
      
      // Ensure the user is authorized to see group members
      const user = req.user as User;
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(member => member.id === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You are not authorized to view this group\'s members' });
      }
      
      // Create a minimal representation of each member with only the data required for UI
      const minimalMemberData = members.map(member => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        display_name: member.display_name,
        // Include email only because it's needed for expense assignment and invitation features
        email: member.email
      }));
      
      res.json(minimalMemberData);
    } catch (err) {
      console.error('Error fetching group members:', err);
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
      
      // Enhance expenses with minimal user information needed for UI
      const enhancedExpenses = await Promise.all(expenses.map(async (expense) => {
        // Get the user who paid for the expense and add only essential fields
        const paidByUser = expense.paidByUserId ? await storage.getUser(expense.paidByUserId) : null;
        
        // Get the user who created the expense and add only essential fields
        const createdByUser = expense.createdByUserId ? await storage.getUser(expense.createdByUserId) : null;
        
        // Create user objects with only the necessary fields for the UI
        const minimalPaidByUser = paidByUser ? {
          id: paidByUser.id,
          first_name: paidByUser.first_name,
          last_name: paidByUser.last_name,
          display_name: paidByUser.display_name
        } : null;
        
        const minimalCreatedByUser = createdByUser ? {
          id: createdByUser.id,
          first_name: createdByUser.first_name,
          last_name: createdByUser.last_name,
          display_name: createdByUser.display_name
        } : null;
        
        return {
          ...expense,
          paidByUser: minimalPaidByUser,
          createdByUser: minimalCreatedByUser
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
      // Add current user ID as the createdByUserId
      const currentUserId = (req.user as User).id;
      const expenseData = {
        ...req.body,
        groupId,
        createdByUserId: currentUserId,
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
      
      // First, try to get the expense as a transaction (new system)
      const transaction = await storage.getTransaction(id);
      
      // If not found in transactions or not an expense type, try the legacy expenses table
      if (!transaction || transaction.type !== TransactionType.EXPENSE) {
        const legacyExpense = await storage.getExpense(id);
        if (!legacyExpense) {
          console.error('Expense not found in either transactions or expenses table:', id);
          return res.status(404).json({ message: 'Expense not found' });
        }
        
        // We found it in the legacy system - handle it there
        console.log('Found expense in legacy system, id:', id);
        // Rest of legacy expense deletion handling...
        // This code is unlikely to be reached in practice, but kept for backward compatibility
        
        const currentUserId = (req.user as User).id;
        
        // Get the group to check if the current user is the admin (group creator)
        const groupId = legacyExpense.groupId;
        if (typeof groupId !== 'number') {
          console.error('Invalid group ID for expense:', legacyExpense.id);
          return res.status(400).json({ message: 'Invalid group ID for this expense' });
        }
        
        const group = await storage.getGroup(groupId);
        if (!group) {
          console.error('Group not found for expense:', groupId);
          return res.status(404).json({ message: 'Group not found for this expense' });
        }
        
        // Check if the current user is the expense creator, payer, or the group admin (creator)
        const isGroupAdmin = group.createdById === currentUserId;
        const isPayer = legacyExpense.paidByUserId === currentUserId;
        const isExpenseCreator = legacyExpense.createdByUserId === currentUserId;
        
        console.log('Legacy DELETE EXPENSE DEBUG INFO:');
        console.log(`Expense ID: ${id}`);
        console.log(`Current user ID: ${currentUserId}`);
        console.log(`Group creator ID: ${group.createdById}`);
        console.log(`Expense payer ID: ${legacyExpense.paidByUserId}`);
        console.log(`Expense creator ID: ${legacyExpense.createdByUserId}`);
        console.log(`Is Group Admin: ${isGroupAdmin}`);
        console.log(`Is Payer: ${isPayer}`);
        console.log(`Is Expense Creator: ${isExpenseCreator}`);
        
        if (!isGroupAdmin && !isPayer && !isExpenseCreator) {
          console.log('Access denied: User is not authorized to delete this expense');
          return res.status(403).json({ 
            message: 'Only the expense creator, payer, or group admin can delete this expense' 
          });
        }
        
        console.log('Access granted: User is authorized to delete this expense');
        
        await storage.deleteExpense(id);
        return res.json({ message: 'Legacy expense deleted' });
      }
      
      // We found the expense in the transaction system - handle it there
      console.log('Found expense in transaction system, id:', id);
      
      const currentUserId = (req.user as User).id;
      
      // Get the group to check if the current user is the admin (group creator)
      const groupId = transaction.groupId;
      if (typeof groupId !== 'number') {
        console.error('Invalid group ID for transaction expense:', transaction.id);
        return res.status(400).json({ message: 'Invalid group ID for this expense' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        console.error('Group not found for transaction expense:', groupId);
        return res.status(404).json({ message: 'Group not found for this expense' });
      }
      
      // Check if the current user is the expense creator, payer, or the group admin (creator)
      // Always parse these values to ensure consistent type comparison
      const isGroupAdmin = Number(group.createdById) === Number(currentUserId);
      const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
      const isExpenseCreator = Number(transaction.createdByUserId) === Number(currentUserId);
      
      // Add detailed debug logs
      console.log('DELETE TRANSACTION EXPENSE DEBUG INFO:');
      console.log(`Transaction ID: ${id}`);
      console.log(`Current user ID: ${currentUserId} (${typeof currentUserId})`);
      console.log(`Group creator ID: ${group.createdById} (${typeof group.createdById})`);
      console.log(`Expense payer ID: ${transaction.paidByUserId} (${typeof transaction.paidByUserId})`);
      console.log(`Expense creator ID: ${transaction.createdByUserId} (${typeof transaction.createdByUserId})`);
      console.log(`Is Group Admin: ${isGroupAdmin}`);
      console.log(`Is Payer: ${isPayer}`);
      console.log(`Is Expense Creator: ${isExpenseCreator}`);
      
      if (!isGroupAdmin && !isPayer && !isExpenseCreator) {
        console.log('Access denied: User is not authorized to delete this expense');
        return res.status(403).json({ 
          message: 'Only the expense creator, payer, or group admin can delete this expense' 
        });
      }
      
      console.log('Access granted: User is authorized to delete this transaction expense');
      
      // Use the transaction system to delete the expense
      const updatedTransaction = await storage.deleteTransaction(id, currentUserId);
      if (updatedTransaction) {
        // Return the updated transaction with the soft delete flags
        return res.json(updatedTransaction);
      } else {
        return res.status(500).json({ message: 'Failed to delete expense transaction' });
      }
    } catch (err) {
      console.error('Error in delete expense route:', err);
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
      
      // First, get the expense as a transaction
      const transaction = await storage.getTransaction(id);
      if (!transaction || transaction.type !== TransactionType.EXPENSE) {
        console.error('Expense transaction not found:', id);
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      const currentUserId = (req.user as User).id;
      
      // Get the group to check if the current user is the admin (group creator)
      const groupId = transaction.groupId;
      
      // Ensure groupId is a number and exists
      if (typeof groupId !== 'number') {
        console.error('Invalid group ID for transaction:', transaction.id);
        return res.status(400).json({ message: 'Invalid group ID for this expense' });
      }
      
      const group = await storage.getGroup(groupId);
      if (!group) {
        console.error('Group not found for expense:', groupId);
        return res.status(404).json({ message: 'Group not found for this expense' });
      }
      
      // Check if the current user is the expense creator, payer, or the group admin (creator)
      // Always parse these values to ensure consistent type comparison
      const isGroupAdmin = Number(group.createdById) === Number(currentUserId);
      const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
      const isExpenseCreator = Number(transaction.createdByUserId) === Number(currentUserId);
      
      if (!isGroupAdmin && !isPayer && !isExpenseCreator) {
        return res.status(403).json({ 
          message: 'Only the expense creator, payer, or group admin can update this expense' 
        });
      }
      
      // Retain the original groupId and createdByUserId
      const updatedData = {
        ...req.body,
        groupId: transaction.groupId,
        createdByUserId: transaction.createdByUserId || currentUserId,
        type: TransactionType.EXPENSE
      };
      
      // Validate the data
      const validatedData = insertTransactionSchema.safeParse(updatedData);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        console.error('Validation error:', error.message);
        return res.status(400).json({ message: error.message });
      }
      
      console.log('Updating expense transaction with data:', validatedData.data);
      const updatedTransaction = await storage.updateTransaction(id, validatedData.data, currentUserId);
      console.log('Expense transaction updated successfully:', updatedTransaction);
      res.json(updatedTransaction);
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
  
  // Transaction routes (new unified system)
  // ==========================================================
  
  // Get all transactions for a group
  app.get('/api/groups/:groupId/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: 'Invalid group ID' });
      }
      
      // Verify group exists and user is a member
      const userGroups = await storage.getUserGroups((req.user as User).id);
      const isMember = userGroups.some(g => g.id === groupId);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }
      
      const transactions = await storage.getGroupTransactions(groupId);
      // Return transactions without modifying them - the user details are already present
      // from the getGroupTransactions method
      res.json(transactions);
    } catch (err) {
      console.error('Error fetching group transactions:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get a specific transaction
  app.get('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if user is a member of the group
      const currentUserId = (req.user as User).id;
      const userGroups = await storage.getUserGroups(currentUserId);
      const isMember = userGroups.some(g => g.id === transaction.groupId);
      
      // Allow access if: 
      // 1. User is a member of the group, or
      // 2. User is involved in the transaction (as payer, recipient, or has a split)
      if (!isMember && 
          transaction.paidByUserId !== currentUserId && 
          transaction.toUserId !== currentUserId) {
        // Check if user has a split in this transaction
        const userTransactions = await storage.getUserTransactions(currentUserId);
        const isInvolved = userTransactions.some(t => t.id === id);
        
        if (!isInvolved) {
          return res.status(403).json({ message: 'Not authorized to view this transaction' });
        }
      }
      
      res.json(transaction);
    } catch (err) {
      console.error('Error fetching transaction:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Create a new transaction
  app.post('/api/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as User;
      const transactionData = req.body;
      
      // Validate the transaction data
      const validatedData = insertTransactionSchema.safeParse(transactionData);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Set the current user as the creator if not specified
      if (!validatedData.data.createdByUserId) {
        validatedData.data.createdByUserId = currentUser.id;
      }
      
      // If this is a group transaction, verify group exists and user is a member
      if (validatedData.data.groupId) {
        const userGroups = await storage.getUserGroups(currentUser.id);
        const isMember = userGroups.some(g => g.id === validatedData.data.groupId);
        
        if (!isMember) {
          return res.status(403).json({ message: 'You are not a member of this group' });
        }
      }
      
      // Create the transaction
      const transaction = await storage.createTransaction(validatedData.data);
      
      res.status(201).json(transaction);
    } catch (err) {
      console.error('Error creating transaction:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Update a transaction
  app.patch('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if user is authorized to update this transaction
      const currentUserId = (req.user as User).id;
      const isSettlement = transaction.type === TransactionType.SETTLEMENT;
      
      // For settlements, also allow the recipient (toUserId) to update
      if (isSettlement) {
        if (transaction.createdByUserId !== currentUserId && 
            transaction.paidByUserId !== currentUserId &&
            transaction.toUserId !== currentUserId) {
          return res.status(403).json({ message: 'Not authorized to update this transaction' });
        }
      } else {
        // For non-settlements (expenses), only allow creator or payer
        if (transaction.createdByUserId !== currentUserId && transaction.paidByUserId !== currentUserId) {
          return res.status(403).json({ message: 'Not authorized to update this transaction' });
        }
      }
      
      // Validate the update data
      const updateData = req.body;
      
      // For settlement transactions, if status is being changed to COMPLETED
      // we need to mark the transaction splits as settled
      if (
        transaction.type === TransactionType.SETTLEMENT &&
        transaction.status !== TransactionStatus.COMPLETED &&
        updateData.status === TransactionStatus.COMPLETED
      ) {
        // Add completedAt timestamp if not provided
        if (!updateData.completedAt) {
          updateData.completedAt = new Date();
        }
        
        // Update the transaction with audit information
        const updatedTransaction = await storage.updateTransaction(id, updateData, currentUserId);
        
        // Mark relevant expense splits as settled
        await storage.markTransactionSplitsAsSettled(id);
        
        return res.json(updatedTransaction);
      }
      
      // For other updates, include user ID for audit purposes
      const updatedTransaction = await storage.updateTransaction(id, updateData, currentUserId);
      res.json(updatedTransaction);
    } catch (err) {
      console.error('Error updating transaction:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Delete a transaction (implemented as soft delete)
  app.delete('/api/transactions/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid transaction ID' });
      }
      
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      // Check if user is authorized to delete this transaction
      const currentUserId = (req.user as User).id;
      const isSettlement = transaction.type === TransactionType.SETTLEMENT;
      
      // Allow deletion based on role in the transaction
      const isCreator = Number(transaction.createdByUserId) === Number(currentUserId);
      const isPayer = Number(transaction.paidByUserId) === Number(currentUserId);
      // Also allow recipient for settlements
      const isRecipient = isSettlement && Number(transaction.toUserId) === Number(currentUserId);
      
      if (!isCreator && !isPayer && !isRecipient) {
        console.log('Access denied: User is not authorized to delete this transaction');
        console.log(`Transaction creator ID: ${transaction.createdByUserId} (${typeof transaction.createdByUserId})`);
        console.log(`Transaction payer ID: ${transaction.paidByUserId} (${typeof transaction.paidByUserId})`);
        console.log(`Transaction recipient ID: ${transaction.toUserId} (${typeof transaction.toUserId})`);
        console.log(`Current user ID: ${currentUserId} (${typeof currentUserId})`);
        console.log(`Is Creator: ${isCreator}, Is Payer: ${isPayer}, Is Recipient: ${isRecipient}`);
        return res.status(403).json({ message: 'Not authorized to delete this transaction' });
      }
      
      console.log('Access granted: User is authorized to delete this transaction');
      
      // We WILL allow deletion of completed settlements for now
      // This can be restricted again in the future if needed
      // if (
      //   transaction.type === TransactionType.SETTLEMENT &&
      //   transaction.status === TransactionStatus.COMPLETED
      // ) {
      //   return res.status(400).json({ message: 'Cannot delete a completed settlement' });
      // }
      
      // Perform soft delete with audit information
      const updatedTransaction = await storage.deleteTransaction(id, currentUserId);
      if (updatedTransaction) {
        // Return the updated transaction with the soft delete flags
        res.json(updatedTransaction);
      } else {
        res.status(500).json({ message: 'Failed to delete transaction' });
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      res.status(500).json({ message: (err as Error).message });
    }
  });
  
  // Get user's transactions
  app.get('/api/users/:userId/transactions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Only allow users to access their own transactions
      const currentUserId = (req.user as User).id;
      if (userId !== currentUserId) {
        return res.status(403).json({ message: 'Not authorized to view these transactions' });
      }
      
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (err) {
      console.error('Error fetching user transactions:', err);
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
      
      // Allow either:
      // 1. The debtor to create a settlement they're paying for (fromUserId is their ID)
      // 2. The creditor to create a settlement for a received payment (toUserId is their ID)
      const user = req.user as User;
      
      if (validatedData.data.fromUserId !== user.id && validatedData.data.toUserId !== user.id) {
        return res.status(403).json({ message: 'You can only create settlements where you are either the payer or recipient' });
      }
      
      // If status is COMPLETED, set the completedAt timestamp
      const dataToCreate: any = {...validatedData.data};
      if (dataToCreate.status === SettlementStatus.COMPLETED) {
        dataToCreate.completedAt = new Date();
      }
      
      const settlement = await storage.createSettlement(dataToCreate);
      
      // If the settlement is completed, mark the corresponding splits as settled
      if (settlement.status === SettlementStatus.COMPLETED) {
        await storage.markExpenseSplitsAsSettled(settlement.id);
      }
      
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
      
      // Check if user is a member of the group
      const user = req.user as User;
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
  
  // Update a settlement (mark as completed, canceled, etc.)
  app.put('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid settlement ID' });
      }
      
      const updateSettlementSchema = z.object({
        status: z.string().optional(),
        transactionReference: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        completedAt: z.date().optional().nullable()
      });
      
      const validatedData = updateSettlementSchema.safeParse(req.body);
      if (!validatedData.success) {
        const error = fromZodError(validatedData.error);
        return res.status(400).json({ message: error.message });
      }
      
      // Get the settlement
      const settlement = await storage.getSettlement(id);
      if (!settlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check if the requesting user is part of the settlement
      const user = req.user as User;
      if (settlement.fromUserId !== user.id && settlement.toUserId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to update this settlement' });
      }
      
      // Only the payer (fromUserId) can update most fields
      // The recipient (toUserId) might only be allowed to confirm receipt in some cases
      // For simplicity, allowing both to update status
      
      // If status is being changed to COMPLETED, set the completedAt timestamp
      const dataToUpdate: any = {...validatedData.data};
      if (dataToUpdate.status === SettlementStatus.COMPLETED) {
        dataToUpdate.completedAt = new Date();
      }
      
      const updatedSettlement = await storage.updateSettlement(id, dataToUpdate);
      
      // If the settlement status is now completed, mark the expense splits as settled
      if (dataToUpdate.status === SettlementStatus.COMPLETED) {
        await storage.markExpenseSplitsAsSettled(id);
      }
      
      res.json(updatedSettlement);
    } catch (error) {
      console.error('Error updating settlement:', error);
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Delete a settlement
  app.delete('/api/settlements/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid settlement ID' });
      }
      
      // Get the settlement
      const settlement = await storage.getSettlement(id);
      if (!settlement) {
        return res.status(404).json({ message: 'Settlement not found' });
      }
      
      // Check if the requesting user is authorized to delete this settlement
      // Allow deletion by either the creator (fromUserId) or the payer (paidByUserId)
      const user = req.user as User;
      if (settlement.fromUserId !== user.id && settlement.toUserId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this settlement' });
      }
      
      // Don't allow deletion of completed settlements
      // if (settlement.status === SettlementStatus.COMPLETED) {
      //   return res.status(400).json({ message: 'Cannot delete a completed settlement' });
      // }
      
      const deleted = await storage.deleteSettlement(id);
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: 'Failed to delete settlement' });
      }
    } catch (error) {
      console.error('Error deleting settlement:', error);
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
    // Create minimal user representations for any user data before broadcasting
    
    // Process single user field
    if (data.user) {
      data.user = {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        displayName: data.user.displayName,
        email: data.user.email
      };
    }
    
    // Process user arrays
    const minimizeUserArray = (users: any[]) => {
      return users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        email: user.email
      }));
    };
    
    if (data.users && Array.isArray(data.users)) {
      data.users = minimizeUserArray(data.users);
    }
    
    if (data.members && Array.isArray(data.members)) {
      data.members = minimizeUserArray(data.members);
    }
    
    if (data.creatorInfo) {
      data.creatorInfo = {
        id: data.creatorInfo.id,
        firstName: data.creatorInfo.firstName,
        lastName: data.creatorInfo.lastName,
        displayName: data.creatorInfo.displayName,
        email: data.creatorInfo.email
      };
    }
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && clientGroups.get(client) === groupId) {
        client.send(JSON.stringify(data));
      }
    });
  };
  
  
  return httpServer;
}
