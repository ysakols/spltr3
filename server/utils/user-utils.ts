import { User } from "@shared/schema";
import { db } from "../db";
import { eq, and, count } from "drizzle-orm";
import { userGroups } from "@shared/schema";

/**
 * Sanitize a user object by removing sensitive fields
 * @param user User object to sanitize
 * @returns User object without sensitive fields
 */
export function sanitizeUser(user: User) {
  if (!user) return null;
  
  // Create a shallow copy of the user object
  const sanitizedUser = { ...user };
  
  // Remove the password field
  delete sanitizedUser.password;
  
  return sanitizedUser;
}

/**
 * Sanitize an array of user objects by removing sensitive fields
 * @param users Array of user objects to sanitize
 * @returns Array of user objects without sensitive fields
 */
export function sanitizeUsers(users: User[]) {
  return users.map(sanitizeUser).filter(Boolean) as User[];
}

/**
 * Check if a user is a member of a group
 * @param userId User ID to check
 * @param groupId Group ID to check
 * @returns True if the user is a member of the group, false otherwise
 */
export async function isUserInGroup(userId: number, groupId: number): Promise<boolean> {
  const result = await db
    .select()
    .from(userGroups)
    .where(
      and(
        eq(userGroups.userId, userId),
        eq(userGroups.groupId, groupId),
        eq(userGroups.isActive, true)
      )
    );
  
  return result.length > 0;
}