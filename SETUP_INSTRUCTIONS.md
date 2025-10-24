# Quick Setup Instructions

Your Medical Device Image Checker now has Google authentication! 🔐

## What Was Added

1. ✅ **NextAuth.js v5** - Modern authentication for Next.js
2. ✅ **Google OAuth Provider** - Sign in with Google
3. ✅ **Domain Restriction** - Limit access to your organization
4. ✅ **Protected Routes** - All routes require authentication
5. ✅ **Auth UI Components** - Login screens and user profile display

## Setup in 5 Minutes

### Step 1: Get Google OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Add redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Copy your **Client ID** and **Client Secret**

### Step 2: Create Environment File

Create a file named `.env.local` in the root directory:

```bash
# Generate this with: openssl rand -base64 32
AUTH_SECRET=paste-generated-secret-here

# From Google Console
AUTH_GOOGLE_ID=your-client-id-here
AUTH_GOOGLE_SECRET=your-client-secret-here

# Optional: If using Vercel Blob
BLOB_READ_WRITE_TOKEN=your-blob-token
```

Generate your `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Step 3: Configure Allowed Domains

Edit `src/auth.ts` and add your organization's email domains:

```typescript
const ALLOWED_DOMAINS: string[] = [
  "yourcompany.com",    // Replace with your domain
  "partner-company.com" // Add additional domains as needed
]
```

⚠️ **Important**: If you leave this empty, ANY Google account can sign in!

### Step 4: Test It

```bash
pnpm dev
```

Open http://localhost:3000 and you should see the login screen!

## Deploy to Production

### For Vercel:

1. Push your changes to GitHub
2. In Vercel project settings, add environment variables:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
3. Update Google Console redirect URIs to include your Vercel URL
4. Deploy!

### For Other Platforms:

Make sure to:
- Set all environment variables
- Update Google OAuth redirect URIs
- Ensure your domain is in `ALLOWED_DOMAINS`

## Troubleshooting

### "No allowed domains" warning
**Fix**: Add your email domain to `ALLOWED_DOMAINS` in `src/auth.ts`

### "Configuration error"
**Fix**: Check your `.env.local` file has all three AUTH_ variables

### Can't sign in
**Fix**: Verify your email domain is in `ALLOWED_DOMAINS`

### Works locally but not in production
**Fix**: 
1. Check environment variables are set in production
2. Verify redirect URI in Google Console matches your production URL
3. Ensure `trustHost: true` is set in `auth.ts` (already configured)

## Security Notes

✅ All routes are protected by middleware
✅ Unauthenticated users are automatically redirected
✅ Sessions are securely managed
✅ Domain restriction prevents unauthorized access

## Need More Help?

See [AUTH_SETUP.md](./AUTH_SETUP.md) for detailed documentation.

