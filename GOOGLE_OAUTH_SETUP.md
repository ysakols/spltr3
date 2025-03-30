# Google OAuth Setup Guide

This guide will help you set up Google OAuth for your expense-sharing application on Replit.

## Current Configuration

Your application is configured to use the ID-based Replit domain:
```
https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co
```

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to "APIs & Services" > "OAuth consent screen"
4. Configure the consent screen:
   - Select "External" user type
   - Add application name, user support email, and developer contact information
   - Add scopes for "email" and "profile"
   - Add test users (including your own email)

### 2. Create OAuth Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Set application type to "Web application"
4. Add the following for **ID-based domain** (recommended):
   - **Name**: ExpenseShare App (or any name you prefer)
   - **Authorized JavaScript origins**: `https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co`
   - **Authorized redirect URIs**: `https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co/auth/google/callback`

5. Click "Create" and note your Client ID and Client Secret

### 3. Configure Environment Variables in Replit

Set the following secrets in your Replit environment:

- **GOOGLE_CLIENT_ID**: Your OAuth client ID
- **GOOGLE_CLIENT_SECRET**: Your client secret
- **GOOGLE_CALLBACK_URL**: `https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co/auth/google/callback`

## Alternative Configuration (Standard Domain)

If you prefer to use the standard Replit domain format, use these values instead:

- **Authorized JavaScript origins**: `https://workspace.ysakols.repl.co`
- **Authorized redirect URIs**: `https://workspace.ysakols.repl.co/auth/google/callback`
- **GOOGLE_CALLBACK_URL**: `https://workspace.ysakols.repl.co/auth/google/callback`

## Troubleshooting

### Common Issues

1. **"Error: redirect_uri_mismatch"**
   - Ensure the callback URL in your Google Cloud Console credentials matches exactly with the GOOGLE_CALLBACK_URL environment variable
   - Check for trailing slashes, http vs https, etc.

2. **"Error: invalid_client"**
   - Verify your client ID and client secret are correct
   - Ensure they're properly set as environment variables

3. **"This browser or app may not be secure"**
   - Your project may need to go through Google verification
   - During development, add your email as a test user in the OAuth consent screen configuration

4. **Application not redirecting properly after authentication**
   - Check server logs for authentication errors
   - Verify session configuration is correct
   - Ensure your app's frontend correctly handles the authentication flow

### Debugging Tools

1. Run the debug script to check your configuration:
   ```
   node debug-oauth.js
   ```

2. Check which Replit domain format is being used:
   ```
   node detect-replit-url.js
   ```

3. Review the server logs for detailed authentication flow information.

### Important Notes

- Google OAuth requires HTTPS, which Replit provides by default
- Replit projects have two possible domain formats:
  - Standard: `{project-name}.{username}.repl.co`
  - ID-based: `{project-id}.id.repl.co`
- The ID-based domain is more stable and recommended for OAuth configuration
- You must use the same domain format consistently across all OAuth configuration settings

## Testing Your Setup

1. Navigate to your application's login page
2. Click the "Sign in with Google" button
3. You should be redirected to Google's authentication page
4. After authenticating, you should be redirected back to your application and logged in

If you encounter any issues, check the server logs and run the debugging tools to identify the problem.