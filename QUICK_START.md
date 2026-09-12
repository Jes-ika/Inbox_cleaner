# InboxClean - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Clone/Setup
```bash
cd C:\Users\jesik\Desktop\inboxcleaner
npm install
```

### Step 2: Get Google Credentials
1. Go to https://console.cloud.google.com/
2. Create new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web app)
5. Add redirect: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret

### Step 3: Configure Environment
Create/edit `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
```

Generate secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Run
```bash
npm run dev
```

Visit: http://localhost:3000

### Step 5: Test
1. Click "Connect Gmail"
2. Complete Google OAuth
3. See dashboard with email stats

## 📁 Project Structure

```
inboxcleaner/
├── app/                    # Pages & API routes
│   ├── page.tsx           # Landing
│   ├── dashboard/         # Dashboard
│   ├── subscriptions/     # Subscriptions
│   ├── cleanup/           # Cleanup
│   ├── settings/          # Settings
│   └── api/               # API routes
├── components/            # React components
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
├── types/                 # TypeScript types
└── utils/                 # Constants
```

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | NextAuth configuration |
| `lib/gmail.ts` | Gmail API utilities |
| `hooks/useAuth.ts` | Authentication hook |
| `app/api/auth/[...nextauth]/route.ts` | Auth handler |
| `app/api/emails/promotional/route.ts` | Fetch emails |

## 🎯 Main Features

- ✅ Google OAuth authentication
- ✅ Fetch promotional emails
- ✅ Group emails by sender
- ✅ Archive/trash emails
- ✅ Unsubscribe from senders
- ✅ Protected pages
- ✅ Real-time stats

## 📊 API Endpoints

```
GET  /api/emails/promotional      # Fetch promotional emails
POST /api/emails/archive          # Archive emails
POST /api/emails/trash            # Trash emails
POST /api/emails/unsubscribe      # Unsubscribe from sender
GET  /api/auth/session            # Get session
POST /api/auth/signin             # Sign in
POST /api/auth/signout            # Sign out
```

## 🧪 Test Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🔐 Environment Variables

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` |
| `NEXTAUTH_SECRET` | `random_hex_string` |
| `NEXTAUTH_URL` | `http://localhost:3000` |

## 🐛 Troubleshooting

### "Invalid Client ID"
- Check `.env.local` has correct credentials
- Verify in Google Cloud Console

### "Redirect URI mismatch"
- Add `http://localhost:3000/api/auth/callback/google` to authorized URIs

### "Gmail API not enabled"
- Enable Gmail API in Google Cloud Console
- Wait 5 minutes for changes

### "No emails found"
- Check you have promotional emails in Gmail
- Gmail API returns last 30 days by default

## 📚 Documentation

- `README.md` - Full documentation
- `PHASE1_SUMMARY.md` - Phase 1 details
- `PHASE2_SETUP.md` - Phase 2 setup guide
- `PHASE2_SUMMARY.md` - Phase 2 details

## 🚢 Deployment

### For Production
1. Update `NEXTAUTH_URL` to your domain
2. Add domain to Google OAuth authorized URIs
3. Generate strong `NEXTAUTH_SECRET`
4. Deploy to Vercel, Netlify, or your server

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

## 💡 Tips

- Use `useAuth()` hook to access user session
- All API routes require authentication
- Protected pages redirect to home if not authenticated
- Gmail API has rate limits (check quotas)
- Access tokens refresh automatically

## 🎓 Learning Resources

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Gmail API Guide](https://developers.google.com/gmail/api)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Support

For issues:
1. Check troubleshooting section
2. Review error messages
3. Check browser console
4. Check server logs

## 🎉 You're Ready!

Your InboxClean MVP is ready to use. Start with:
1. `npm run dev`
2. Visit http://localhost:3000
3. Click "Connect Gmail"
4. Explore the dashboard

Happy cleaning! 🧹
