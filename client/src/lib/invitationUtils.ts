/**
 * Utility functions for handling invitation links and redirects
 */

/**
 * Gets the current base URL of the application
 * This is more reliable than server-side environment variables in Replit
 */
export function getBaseUrl(): string {
  // Use window.location to get the current origin
  // This ensures the URL is always correct regardless of environment
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for server-side rendering (unlikely in our case)
  return 'http://localhost:5000';
}

/**
 * Generates a complete invitation URL for a given token
 */
export function getInvitationUrl(token: string): string {
  return `${getBaseUrl()}/invitation/${token}`;
}

/**
 * Copies the invitation link to clipboard
 * Returns a promise that resolves when copying is complete
 */
export async function copyInvitationLink(token: string): Promise<boolean> {
  try {
    const url = getInvitationUrl(token);
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy invitation link:', error);
    return false;
  }
}