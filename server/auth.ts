import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import { User, InsertUser, GroupInvitation } from "@shared/schema";
import { Request, Response, NextFunction } from "express";

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : ""}/auth/google/callback`,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await storage.getUserByGoogleId(profile.id);
        
        // If user doesn't exist, create a new one
        if (!user) {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          // Check if user exists with this email
          if (email) {
            const existingUserByEmail = await storage.getUserByEmail(email);
            if (existingUserByEmail) {
              // Update existing user with Google ID
              user = await storage.updateUser(existingUserByEmail.id, {
                googleId: profile.id,
                googleAccessToken: accessToken,
                // Don't overwrite the username if it already exists
                firstName: existingUserByEmail.firstName || profile.name?.givenName || null,
                lastName: existingUserByEmail.lastName || profile.name?.familyName || null,
                avatarUrl: existingUserByEmail.avatarUrl || (profile.photos && profile.photos[0] ? profile.photos[0].value : null)
              });
              
              // Process any pending invitations for this email
              await processPendingInvitations(existingUserByEmail.id, email);
              
              return done(null, user);
            }
          }
          
          // Create a new user based on email
          const firstName = profile.name?.givenName;
          const newUser: InsertUser = {
            password: "", // Empty password for OAuth users
            email: email,
            firstName: firstName || null,
            lastName: profile.name?.familyName || null,
            displayName: profile.displayName || firstName || email.split('@')[0] || null,
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            googleId: profile.id,
            googleAccessToken: accessToken
          };
          
          user = await storage.createUser(newUser);
          
          // Process any pending invitations for this email
          if (email) {
            await processPendingInvitations(user.id, email);
          }
        } else {
          // Update the access token
          user = await storage.updateUser(user.id, {
            googleAccessToken: accessToken
          });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

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