// OAuth Debugging script
// Run this to verify your Google OAuth configuration

console.log('Debugging Google OAuth Configuration');
console.log('-----------------------------------');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

// Function to safely display part of a secret
function maskSecret(secret, showStart = 5, showEnd = 5) {
  if (!secret) return 'undefined';
  if (secret.length <= showStart + showEnd) return '***'; // Too short to meaningfully mask
  return secret.substring(0, showStart) + '...' + secret.substring(secret.length - showEnd);
}

// Check for environment variables
console.log('\nEnvironment Variables:');
console.log('- GOOGLE_CLIENT_ID: ' + (googleClientId ? maskSecret(googleClientId) : 'NOT SET'));
console.log('- GOOGLE_CLIENT_SECRET: ' + (googleClientSecret ? maskSecret(googleClientSecret, 3, 3) : 'NOT SET'));
console.log('- GOOGLE_CALLBACK_URL: ' + (googleCallbackUrl || 'NOT SET'));

// Check for Replit-specific variables
console.log('\nReplit Environment:');
console.log('- REPL_ID: ' + (process.env.REPL_ID || 'NOT SET'));
console.log('- REPL_SLUG: ' + (process.env.REPL_SLUG || 'NOT SET'));
console.log('- REPL_OWNER: ' + (process.env.REPL_OWNER || 'NOT SET'));

// Generate URLs based on Replit environment
if (process.env.REPL_ID) {
  console.log('\nGenerated ID-based URLs:');
  console.log('- Domain: https://' + process.env.REPL_ID + '.id.repl.co');
  console.log('- Callback: https://' + process.env.REPL_ID + '.id.repl.co/auth/google/callback');
}

if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
  console.log('\nGenerated Standard URLs:');
  console.log('- Domain: https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co');
  console.log('- Callback: https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co/auth/google/callback');
}

// Validation checks
console.log('\nValidation Results:');

// Check if all required variables are set
const hasAllVars = googleClientId && googleClientSecret && googleCallbackUrl;
console.log('- All required variables set: ' + (hasAllVars ? '✅ Yes' : '❌ No'));

// Check if callback URL matches Replit domain patterns
let callbackMatches = false;
if (googleCallbackUrl) {
  const idPattern = process.env.REPL_ID ? process.env.REPL_ID + '.id.repl.co' : null;
  const standardPattern = process.env.REPL_SLUG && process.env.REPL_OWNER 
    ? process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co' 
    : null;
    
  callbackMatches = (idPattern && googleCallbackUrl.includes(idPattern)) || 
                    (standardPattern && googleCallbackUrl.includes(standardPattern));
                    
  console.log('- Callback URL matches Replit domain: ' + (callbackMatches ? '✅ Yes' : '❌ No'));
  
  if (!callbackMatches) {
    console.log('  Callback URL should contain either:');
    if (idPattern) console.log('  • ' + idPattern);
    if (standardPattern) console.log('  • ' + standardPattern);
  }
}

// Add troubleshooting tips
console.log('\nTroubleshooting Tips:');
console.log('1. Make sure your Google OAuth credentials are properly configured');
console.log('   - Visit https://console.cloud.google.com/apis/credentials');
console.log('   - Ensure your OAuth Client ID has the correct authorized origins and redirect URIs');
console.log('2. Verify environment variables are set in Replit Secrets');
console.log('   - Check the "Secrets" tool in the left sidebar of Replit');
console.log('3. Ensure GOOGLE_CALLBACK_URL matches the pattern of your Replit domain');
console.log('   - ID-based domain is usually more reliable for Replit projects');
console.log('4. Check that the Google OAuth consent screen is properly configured');
console.log('   - Set app status to "testing" during development');
console.log('   - Add your email as a test user');

console.log('\n-----------------------------------');
console.log('End of OAuth Debug Report');