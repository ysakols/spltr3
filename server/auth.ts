import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { InsertUser, User } from "@shared/schema";

// Configure passport
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Set up Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    const existingUser = await storage.getUserByGoogleId(profile.id);
    
    if (existingUser) {
      return done(null, existingUser);
    }
    
    // If user doesn't exist but has the same email, update their account
    const email = profile.emails?.[0]?.value;
    if (email) {
      const existingUserByEmail = await storage.getUserByEmail(email);
      
      if (existingUserByEmail) {
        // Update the existing user with Google info
        const updatedUser = await storage.updateUser(existingUserByEmail.id, {
          googleId: profile.id,
          firstName: profile.name?.givenName || existingUserByEmail.firstName,
          lastName: profile.name?.familyName || existingUserByEmail.lastName,
          email: email
        });
        
        return done(null, updatedUser);
      }
    }
    
    // Create new user
    const newUser: InsertUser = {
      username: email || `user_${crypto.randomBytes(4).toString('hex')}`,
      firstName: profile.name?.givenName || "",
      lastName: profile.name?.familyName || "",
      email: email || "",
      googleId: profile.id,
      createdAt: new Date()
    };
    
    const user = await storage.createUser(newUser);
    
    // Check for pending invitations for this email
    if (email) {
      const pendingInvitations = await storage.getGroupInvitationsByEmail(email);
      
      for (const invitation of pendingInvitations) {
        if (!invitation.isAccepted && !invitation.isExpired) {
          // Add the user to the group
          await storage.addUserToGroup(invitation.groupId, user.id);
          
          // Mark invitation as accepted
          await storage.updateGroupInvitation(invitation.id, {
            isAccepted: true,
            acceptedAt: new Date()
          });
        }
      }
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, undefined);
  }
}));

// Auth middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: "Not authenticated" });
};

export default passport;