import { User } from "@shared/schema";

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