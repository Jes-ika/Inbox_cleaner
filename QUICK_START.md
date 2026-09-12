# InboxClean — quick start

The five-minute version. [README.md](README.md) has the detail.

## 1. Install

```bash
npm install
```

## 2. Google credentials

[console.cloud.google.com](https://console.cloud.google.com/) →

1. New project
2. Enable the **Gmail API**
3. OAuth consent screen → add scope `https://www.googleapis.com/auth/gmail.modify`
   → add your own account under **Test users**
4. Credentials → OAuth client ID → **Web application**
5. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy the client ID and secret

Step 3 is the one people skip. A restricted scope will not work for an account
that is not on the test-user list.

## 3. Environment

```bash
cp .env.example .env.local
```

Fill in:

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 4. Run

```bash
npm run dev
```

<http://localhost:3000> → **Connect Gmail**.

## Checking it works

```bash
npm run verify    # typecheck + lint + 66 tests
npm run build     # production build
```

Signed out, these should hold — they are quick to check with curl:

| Request | Expected |
| --- | --- |
| `GET /` | 200 |
| `GET /dashboard` | 307 → `/?callbackUrl=%2Fdashboard` |
| `GET /api/emails/promotional` | 401 `{"error":"Not signed in."}` |
| `GET /api/auth/providers` | lists the `google` provider |

## Screens

| Route | What it does |
| --- | --- |
| `/` | Landing page; **Connect Gmail** starts the Google consent flow |
| `/dashboard` | Message count, sender count, mailbox size, top senders |
| `/subscriptions` | Per-sender unsubscribe, one or many, with the outcome per sender |
| `/cleanup` | Select senders → trash or archive their mail → Undo |
| `/settings` | Account, granted scope, activity log, clear local data |
| `/privacy`, `/terms` | Public; required for Google OAuth verification |

## API

| Endpoint | Body | Notes |
| --- | --- | --- |
| `GET /api/emails/promotional` | — | `?limit=` up to 2000, defaults to 500 |
| `POST /api/emails/archive` | `{messageIds}` | Removes the `INBOX` label |
| `POST /api/emails/trash` | `{messageIds}` | Recoverable for 30 days |
| `POST /api/emails/undo` | `{kind, messageIds}` | `kind` is `trash` or `archive` |
| `POST /api/emails/unsubscribe` | `{sender}` | A sender **address**, never a URL |

Every route requires a session. `messageIds` is capped at 1000 per request and
each id is validated.

## Troubleshooting

**`invalid_client` / "The OAuth client was not found"**
The client ID is wrong or empty. Check `.env.local` uses `GOOGLE_CLIENT_ID`
(no `NEXT_PUBLIC_` prefix) and restart the dev server — Next only reads env
files at startup.

**`redirect_uri_mismatch`**
The URI in the Google client must be exactly
`http://localhost:3000/api/auth/callback/google`.

**"Google hasn't verified this app"**
Expected. Add yourself as a test user on the consent screen and continue past it.

**Signed in, but every request returns 401 with `reauth_required`**
The refresh token stopped working. The app starts a new consent flow on its own;
if it loops, remove the app from
[your Google permissions](https://myaccount.google.com/permissions) and connect again.

**No emails found**
The scan reads the Promotions category only (`category:promotions`). If Gmail
puts your newsletters elsewhere, change `GMAIL_QUERY` in `utils/constants.ts`.

**`npm run dev` shows old env values**
Restart it. Env changes are not hot-reloaded.

## Deploying

Set `NEXTAUTH_URL` to the deployed origin, register that origin's callback with
Google, and generate a fresh `NEXTAUTH_SECRET`. Read the
[production section](README.md#going-to-production) first — `gmail.modify` is a
restricted scope, and Google's verification is what actually gates a public
launch.
