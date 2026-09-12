# PHASE 2: Google OAuth & Gmail API Setup Guide

## What Was Built

✅ **Google OAuth Authentication**
- NextAuth.js integration
- Secure JWT-based sessions
- Google provider configuration
- Automatic token refresh

✅ **Gmail API Integration**
- Promotional email fetching
- Email grouping by sender
- Unsubscribe header parsing
- Archive/trash operations

✅ **API Routes**
- `/api/emails/promotional` - Fetch promotional emails
- `/api/emails/archive` - Archive emails
- `/api/emails/trash` - Trash emails
- `/api/emails/unsubscribe` - Unsubscribe from senders

✅ **Frontend Updates**
- Authentication hook (`useAuth`)
- Session provider wrapper
- Protected dashboard with real data
- Dynamic stats and sender lists

## Setup Instructions

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable these APIs:
   - Gmail API
   - Google+ API

4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000` (for production, use your domain)
   - Copy the Client ID and Client Secret

### Step 2: Configure Environment Variables

Edit `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_from_google_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_console
NEXTAUTH_SECRET=generate_a_random_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

Or use this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## How It Works

### Authentication Flow

1. User clicks "Connect Gmail" on landing page
2. Redirected to Google OAuth consent screen
3. User grants permissions for:
   - Gmail read access
   - Gmail modify access (for archive/trash)
4. Google redirects back with authorization code
5. NextAuth exchanges code for access token
6. Session created with JWT containing access token
7. User redirected to dashboard

### Email Fetching

1. Dashboard loads and calls `/api/emails/promotional`
2. API uses Gmail API to fetch emails with `category:promotions`
3. Emails are grouped by sender
4. Stats calculated (total emails, unique senders)
5. Data displayed in dashboard

### Cleanup Operations

1. User selects emails to archive/trash
2. Frontend calls `/api/emails/archive` or `/api/emails/trash`
3. API modifies email labels in Gmail
4. Success response returned to frontend

## File Structure

```
app/
├── api/
│   ├── auth/[...nextauth]/route.ts    # NextAuth handler
│   └── emails/
│       ├── promotional/route.ts        # Fetch emails
│       ├── archive/route.ts            # Archive action
│       ├── trash/route.ts              # Trash action
│       └── unsubscribe/route.ts        # Unsubscribe action
├── page.tsx                            # Landing page
├── dashboard/page.tsx                  # Dashboard (protected)
├── subscriptions/page.tsx              # Subscriptions (protected)
├── cleanup/page.tsx                    # Cleanup (protected)
└── settings/page.tsx                   # Settings (protected)

components/
├── providers/
│   └── SessionProvider.tsx             # NextAuth wrapper
├── layout/
│   ├── Header.tsx                      # Auth-aware header
│   └── Sidebar.tsx
└── ui/
    ├── Button.tsx
    ├── Card.tsx
    └── Modal.tsx

hooks/
└── useAuth.ts                          # Authentication hook

lib/
├── auth.ts                             # NextAuth config
└── gmail.ts                            # Gmail API utilities

types/
└── index.ts                            # TypeScript interfaces
```

## Testing Locally

### Test Authentication

1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Connect Gmail"
4. Complete Google OAuth flow
5. Should redirect to dashboard

### Test Email Fetching

1. After authentication, dashboard should load
2. Stats should show:
   - Total promotional emails
   - Number of unique senders
   - Top senders list

### Test API Directly

```bash
# Get promotional emails
curl -X GET http://localhost:3000/api/emails/promotional

# Archive emails
curl -X POST http://localhost:3000/api/emails/archive \
  -H "Content-Type: application/json" \
  -d '{"messageIds": ["msg_id_1", "msg_id_2"]}'

# Trash emails
curl -X POST http://localhost:3000/api/emails/trash \
  -H "Content-Type: application/json" \
  -d '{"messageIds": ["msg_id_1", "msg_id_2"]}'
```

## Security Notes

1. **Access Tokens**: Stored in JWT, never exposed to client
2. **Refresh Tokens**: Stored securely, used for token refresh
3. **Session**: 30-day expiration, can be configured
4. **NEXTAUTH_SECRET**: Must be strong and kept secret
5. **HTTPS**: Required for production

## Troubleshooting

### "Invalid Client ID"
- Verify Client ID in `.env.local`
- Check Google Cloud Console credentials
- Ensure OAuth app is not restricted

### "Redirect URI mismatch"
- Add `http://localhost:3000/api/auth/callback/google` to authorized URIs
- For production, add your domain

### "Gmail API not enabled"
- Go to Google Cloud Console
- Enable Gmail API for your project
- Wait a few minutes for changes to propagate

### "No promotional emails found"
- Gmail API only returns emails from last 30 days by default
- Check if you have promotional emails in your inbox
- Try with a different query: `is:unread` or `from:newsletter@example.com`

## Next Steps (Phase 3)

1. Implement subscriptions page with real data
2. Add unsubscribe functionality
3. Implement cleanup page with bulk actions
4. Add confirmation modals
5. Add loading states and error handling

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret |
| `NEXTAUTH_SECRET` | Yes | Secret for JWT signing |
| `NEXTAUTH_URL` | Yes | Application URL (http://localhost:3000 for dev) |

## Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [NextAuth Google Provider](https://next-auth.js.org/providers/google)
