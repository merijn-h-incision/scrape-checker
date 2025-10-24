# Google Authentication Setup Guide

This application now requires Google OAuth authentication to restrict access to your organization only.

## 🔐 Setup Steps

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Configure the consent screen if prompted
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
   - Save and copy the Client ID and Client Secret

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# NextAuth Configuration
# Generate a secret with: openssl rand -base64 32
AUTH_SECRET=your-secret-key-here

# Google OAuth Configuration
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Vercel Blob Storage (if using)
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

To generate a secure `AUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

### 3. Configure Allowed Domains

Edit `src/auth.ts` and add your organization's email domains:

```typescript
const ALLOWED_DOMAINS = [
  "yourcompany.com",
  "anothercompany.com"
]
```

**Important:** If no domains are configured, the app will allow ANY Google account to sign in (useful for initial testing only).

### 4. Vercel Deployment Setup

If deploying to Vercel:

1. Add environment variables in your Vercel project settings:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `BLOB_READ_WRITE_TOKEN` (if using Vercel Blob)

2. Update your Google OAuth redirect URIs to include:
   - `https://your-vercel-app.vercel.app/api/auth/callback/google`
   - `https://your-custom-domain.com/api/auth/callback/google`

3. Make sure `trustHost: true` is set in `src/auth.ts` (already configured)

## 🛡️ Security Features

- **Domain Restriction**: Only users with email addresses from configured domains can access the app
- **Protected Routes**: All routes except authentication endpoints require sign-in
- **Session Management**: Secure session handling with NextAuth.js
- **Automatic Redirects**: Unauthenticated users are redirected to the login page

## 📋 Testing Authentication

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open `http://localhost:3000`
3. You should see a login screen
4. Click "Sign in with Google"
5. Sign in with a Google account from your allowed domain
6. You should be redirected to the main application

## 🔧 Troubleshooting

### "Access Denied" Error

- **Cause**: Your email domain is not in the `ALLOWED_DOMAINS` list
- **Solution**: Add your domain to `ALLOWED_DOMAINS` in `src/auth.ts`

### "Configuration Error"

- **Cause**: Missing or invalid environment variables
- **Solution**: Double-check your `.env.local` file has all required variables

### Redirect URI Mismatch

- **Cause**: The OAuth redirect URI doesn't match what's configured in Google Cloud Console
- **Solution**: Ensure the redirect URI in Google Console exactly matches your app URL + `/api/auth/callback/google`

### Session Not Persisting

- **Cause**: Missing or invalid `AUTH_SECRET`
- **Solution**: Generate a new secret with `openssl rand -base64 32` and update `.env.local`

## 🚀 Production Checklist

Before deploying to production:

- [ ] Configure `ALLOWED_DOMAINS` with your organization's domains
- [ ] Set up all environment variables in your hosting platform
- [ ] Add production redirect URIs to Google OAuth credentials
- [ ] Test authentication flow on the production URL
- [ ] Remove any test domains from `ALLOWED_DOMAINS`
- [ ] Ensure `AUTH_SECRET` is a strong, random string

## 📚 Additional Resources

- [NextAuth.js Documentation](https://authjs.dev/)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

