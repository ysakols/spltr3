import passport from "passport";
import { storage } from "./storage";
import { User, InsertUser, GroupInvitation } from "@shared/schema";
import { Request, Response, NextFunction } from "express";

// Process any pending invitations for a user
async function processPendingInvitations(userId: number, email: string): Promise<void> {
  try {
    // Get all pending invitations for this email
    const invitations = await storage.getGroupInvitationsByEmail(email);
    
    // Process each invitation
    for (const invitation of invitations) {
      if (invitation.status === 'pending') {
        // Add user to the group
        await storage.addUserToGroup(invitation.groupId, userId);
        
        // Update invitation status
        await storage.updateGroupInvitation(invitation.id, {
          status: 'accepted',
          acceptedAt: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error processing pending invitations:', error);
  }
}

// Serialize user to the session
passport.serializeUser((user: User, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

export default passport;