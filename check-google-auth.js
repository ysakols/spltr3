// A simple script to check if Google OAuth is properly configured
console.log('Checking Google OAuth Configuration:');
console.log('------------------------------------');

// Check Google OAuth credentials
console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);

// Check Replit domain
const replitDomain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : null;
console.log(`REPLIT_DOMAINS: ${replitDomain || '✗ Missing'}`);

// Display the callback URL that will be used
const callbackURL = replitDomain 
  ? `https://${replitDomain}/auth/google/callback` 
  : '/auth/google/callback';

console.log('\nCallback URL that will be used:');
console.log(callbackURL);

console.log('\nImportant: The callback URL must be registered in the Google Cloud Console.');
console.log('Go to https://console.cloud.google.com/ -> APIs & Services -> Credentials');
console.log('Edit the OAuth 2.0 Client ID and add this URL to the "Authorized redirect URIs" list.');