// This script helps determine the correct Replit URL for Google OAuth configuration

console.log('===== Replit URL Detection Tool =====');

// Check environment variables
const replSlug = process.env.REPL_SLUG || '(unknown)';
const replOwner = process.env.REPL_OWNER || '(unknown)';
const replId = process.env.REPL_ID || '(unknown)';

// Standard Replit domain format
const standardDomain = `${replSlug}.${replOwner}.repl.co`;
console.log('Standard Replit domain:', standardDomain);

// ID-based domain (used in some deployments)
const idDomain = replId ? `${replId}.id.repl.co` : '(unavailable)';
console.log('ID-based Replit domain:', idDomain);

// Construct full URLs with the callback path
console.log('\n===== Google OAuth Configuration =====');
console.log('For Google OAuth, you should use one of these configurations:');

console.log('\nOption 1 - Standard domain:');
console.log('- Authorized JavaScript origins:');
console.log(`  https://${standardDomain}`);
console.log('- Authorized redirect URIs:');
console.log(`  https://${standardDomain}/auth/google/callback`);
console.log('- GOOGLE_CALLBACK_URL value:');
console.log(`  https://${standardDomain}/auth/google/callback`);

console.log('\nOption 2 - ID-based domain:');
console.log('- Authorized JavaScript origins:');
console.log(`  https://${idDomain}`);
console.log('- Authorized redirect URIs:');
console.log(`  https://${idDomain}/auth/google/callback`);
console.log('- GOOGLE_CALLBACK_URL value:');
console.log(`  https://${idDomain}/auth/google/callback`);

console.log('\nChoose whichever domain format works best with your Replit project.');
console.log('Important: The URL you use must be consistent across all three settings!');