/**
 * Utility functions for ID conversion between numeric database IDs
 * and seven-character public-facing IDs
 */

// Convert a numeric ID to a 7-character ID
export function numericToDisplayId(id: number): string {
  // Pad the number to 7 digits, then take the last 7
  return id.toString().padStart(7, '0').slice(-7);
}

// Convert a 7-character ID back to a numeric ID
export function displayToNumericId(displayId: string): number {
  // Strip leading zeros and convert to number
  return parseInt(displayId.replace(/^0+/, '') || '0', 10);
}