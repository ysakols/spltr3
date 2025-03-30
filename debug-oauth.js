// Script to debug OAuth configuration
console.log('Debugging Google OAuth Configuration');
console.log('-----------------------------------');

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL;

console.log('GOOGLE_CLIENT_ID:', googleClientId ? 
  `Present (${googleClientId.substring(0, 5)}...${googleClientId.substring(googleClientId.length - 5)})` : 
  'Missing');

console.log('GOOGLE_CLIENT_SECRET:', googleClientSecret ? 
  `Present (${googleClientSecret.substring(0, 3)}...${googleClientSecret.substring(googleClientSecret.length - 3)})` : 
  'Missing');

console.log('GOOGLE_CALLBACK_URL:', googleCallbackUrl || 'Missing (default: /auth/google/callback)');

// Check for common issues
if (googleClientId && googleClientSecret) {
  console.log('\nOAuth Credentials Check: ✓ Present');
  
  // Check callback URL format
  if (googleCallbackUrl) {
    try {
      const url = new URL(googleCallbackUrl);
      console.log('Callback URL Check: ✓ Valid URL format');
      
      // Verify it's HTTPS (required for Google OAuth)
      if (url.protocol !== 'https:') {
        console.log('❌ Warning: Google requires HTTPS for callback URLs in production');
      } else {
        console.log('HTTPS Check: ✓ Uses HTTPS');
      }
      
      // Check if the path includes /auth/google/callback
      if (!url.pathname.includes('/auth/google/callback')) {
        console.log('❌ Warning: Callback path should typically end with /auth/google/callback');
      } else {
        console.log('Path Check: ✓ Contains expected callback path');
      }
      
    } catch (error) {
      console.log('❌ Error: Callback URL is not a valid URL format');
    }
  } else {
    console.log('Using default callback: /auth/google/callback');
    console.log('❌ Warning: For production, a full URL is recommended (https://your-domain.com/auth/google/callback)');
  }
} else {
  console.log('\n❌ Error: Missing OAuth credentials. Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.');
}

console.log('\nRecommended Actions:');
console.log('1. Ensure the callback URL is properly configured in the Google Cloud Console');
console.log('2. Make sure the callback URL matches exactly what\'s configured in your application');
console.log('3. For Replit, you need to use your Replit domain in the callback URL');
console.log('   Example: https://your-repl-name.your-username.repl.co/auth/google/callback');