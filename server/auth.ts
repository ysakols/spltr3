import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User, InsertUser, GroupInvitation } from "@shared/schema";
import { Request, Response, NextFunction } from "express";

// Process any pending invitations for a user
export async function processPendingInvitations(userId: number, email: string): Promise<void> {
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
passport.serializeUser((user: any, done) => {
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

// Setup local strategy for email/password login
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // If user doesn't exist
      if (!user) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      
      // If user exists, check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false, { message: 'Incorrect email or password' });
      }
      
      // If everything is valid, return the user
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Setup Google OAuth strategy
// Only set up Google strategy if environment variables are set
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('Setting up Google OAuth strategy with callback URL:', process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback");
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if we have a user with this Google ID
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (!user) {
        // Check if we have a user with the same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await storage.getUserByEmail(email);
          
          if (user) {
            // Update existing user with Google info
            user = await storage.updateUser(user.id, {
              googleId: profile.id,
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken,
              // Update avatar if available
              avatarUrl: profile.photos?.[0]?.value || user.avatarUrl
            });
          } else {
            // Create a new user
            const firstName = profile.name?.givenName || '';
            const lastName = profile.name?.familyName || '';
            const displayName = profile.displayName || firstName;
            const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
            
            // Create a random password for Google users (they'll never use it)
            const randomPassword = Math.random().toString(36).slice(-10);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            
            user = await storage.createUser({
              email,
              username,
              displayName: displayName,
              firstName,
              lastName,
              password: hashedPassword,
              googleId: profile.id,
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken,
              avatarUrl: profile.photos?.[0]?.value
            });
            
            // Process any pending invitations for this user
            if (user) {
              await processPendingInvitations(user.id, email);
            }
          }
        } else {
          return done(new Error('No email provided from Google'));
        }
      } else {
        // Update the user's Google-related fields
        user = await storage.updateUser(user.id, {
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          avatarUrl: profile.photos?.[0]?.value || user.avatarUrl
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

export default passport;