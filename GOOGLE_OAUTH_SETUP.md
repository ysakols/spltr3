# Google OAuth Setup Guide

This guide will help you set up Google OAuth for your spltr3 application.

## Prerequisites

1. A Google account
2. Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Spltr3") and click "Create"
5. Wait for the project to be created, then select it from the dropdown

## Step 2: Configure OAuth Consent Screen

1. In the left sidebar, go to "APIs & Services" > "OAuth consent screen"
2. Select "External" as the user type (unless you have a Google Workspace organization)
3. Click "Create"
4. Fill in the required fields:
   - App name: "Spltr3"
   - User support email: Your email address
   - Developer contact information: Your email address
5. Click "Save and Continue"
6. Skip adding scopes for now (click "Save and Continue")
7. Add test users if needed (this is only required for apps in testing mode)
8. Click "Save and Continue"
9. Review your settings and click "Back to Dashboard"

## Step 3: Create OAuth Credentials

1. In the left sidebar, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" at the top and select "OAuth client ID"
3. For Application type, select "Web application"
4. Enter a name for your client (e.g., "Spltr3 Web Client")
5. Under "Authorized JavaScript origins", add:
   - https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co (your Replit URL)
6. Under "Authorized redirect URIs", add:
   - https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co/auth/google/callback
7. Click "Create"

## Step 4: Configure Environment Variables

You need to set three environment variables in your Replit project:

1. `GOOGLE_CLIENT_ID`: The client ID from the credentials you just created
2. `GOOGLE_CLIENT_SECRET`: The client secret from the credentials
3. `GOOGLE_CALLBACK_URL`: The redirect URL (e.g., https://13719520-88f9-42b5-a3fe-ef0b8d50d762.id.repl.co/auth/google/callback)

## Step 5: Verify Setup

1. Restart your Replit server
2. Go to your application's login page
3. Click "Sign in with Google"
4. If everything is configured correctly, you should be redirected to Google's authentication page
5. After authenticating, you should be redirected back to your application and logged in

## Troubleshooting

### "Error: redirect_uri_mismatch"

This error occurs when the redirect URI in your request doesn't match any of the authorized redirect URIs you've configured in the Google Cloud Console. To fix this:

1. Check the exact URL in the error message
2. Go to the Google Cloud Console > APIs & Services > Credentials
3. Edit your OAuth client
4. Make sure the exact URL from the error is listed under "Authorized redirect URIs"
5. Remember URLs are case-sensitive and must include the correct protocol (http:// or https://)

### "Error: invalid_client"

This error suggests there's an issue with your client credentials. To fix:

1. Double-check that your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are correct
2. Make sure you're using the right credentials for the right project

### "Error: access_denied"

This typically means the user denied the permission request or there's an issue with the OAuth consent screen configuration. To fix:

1. Make sure your OAuth consent screen is properly configured
2. Verify that the app is in the appropriate status (testing or production)
3. If in testing mode, ensure the user's email is added as a test user

### "The redirect URI in the request did not match a registered redirect URI"

Similar to "redirect_uri_mismatch", ensure that:

1. The GOOGLE_CALLBACK_URL environment variable matches exactly what you've configured in the Google Cloud Console
2. Your application is running on the expected domain