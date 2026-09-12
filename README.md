# InboxClean

A Gmail inbox cleanup and newsletter-management tool. Group promotional mail by
sender, unsubscribe through the endpoints senders publish, and clear the backlog
with archive or trash — both reversible.

## Status

Feature-complete for local use. `npm run verify` (typecheck + lint + tests) and
`npm run build` both pass.

The one thing that is **not** done, because it cannot be done from a repository:
you need your own Google OAuth credentials. See [Setup](#setup).

Before this can serve users other than yourself, it also needs to pass Google's
OAuth verification — see [Going to production](#going-to-production).

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 18, TypeScript (strict) |
| Styling | Tailwind CSS, `class-variance-authority` for component variants |
| Components | Radix UI primitives (dialog, dropdown menu), `lucide-react` icons |
| Auth | NextAuth v4, Google provider, JWT sessions |
| Mail | Gmail API via `googleapis` |
| Tests | Vitest |
| Persistence | None server-side. Session in an encrypted cookie; an activity log in `localStorage` |

## Setup

### 1. Install

```bash
npm install
```

### 2. Create Google OAuth credentials

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Gmail API** for it.
3. Configure the OAuth consent screen. Add the scope
   `https://www.googleapis.com/auth/gmail.modify` and add your own Google
   account under **Test users** — a restricted scope is limited to listed test
   users until the app is verified.
4. Create credentials → **OAuth client ID** → **Web application**.
5. Add the authorized redirect URI exactly:
   `http://localhost:3000/api/auth/callback/google`
6. Copy the client ID and client secret.

### 3. Configure the environment

Copy the template and fill in the two Google values:

```bash
cp .env.example .env.local
```

```env
GOOGLE_CLIENT_ID=…apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-…
NEXTAUTH_SECRET=…
NEXTAUTH_URL=http://localhost:3000
```

Generate the session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Note the variable name: **`GOOGLE_CLIENT_ID`**, not `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
The client ID is only ever read on the server and has no business in the browser
bundle.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000> and choose **Connect Gmail**.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config, non-interactive) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest, watching |
| `npm run verify` | typecheck + lint + test |

## How it works

### Scanning

`GET /api/emails/promotional` walks the Gmail Promotions category
(`category:promotions`), requesting only the `From`, `List-Unsubscribe` and
`List-Unsubscribe-Post` headers, then groups messages by sender.

**Discovery and action have different scopes, on purpose.** The scan records
whether each message still carries the `INBOX` label, and each sender therefore
carries both `messageIds` (everything) and `inboxMessageIds` (the subset Cleanup
may act on).

That split exists because neither scope works alone:

- Archiving mail that is already archived changes nothing. Counting it would
  overstate the result, and undoing that "archive" would add `INBOX` to hundreds
  of messages that were never in the inbox — dumping old mail back into it. So
  **Cleanup uses the inbox subset**, which keeps its counts truthful and makes
  undo a real inverse.
- But scoping *discovery* to the inbox hides any sender whose mail is already
  archived. A user with a skip-inbox filter would see no senders at all while
  still subscribed to every one of them, and using Cleanup would empty the
  Subscriptions list of exactly the senders they had just rejected. So
  **Subscriptions uses the full list**.

Two limits keep a scan inside Gmail's per-user quota (roughly 250 units/second,
and `messages.get` costs 5): requests run through a concurrency cap with
exponential backoff on 429 and 5xx, and the scan stops at
`DEFAULT_SCAN_LIMIT` (500) messages. `?limit=` overrides it up to
`MAX_SCAN_LIMIT` (2000).

When there is more mail than the window, `truncated` is set and every screen
renders the `ScanCoverage` notice rather than presenting a partial count as the
total. Because the window is shared with archived mail, the response also
carries `totalEstimate` and `inboxEstimate` — Gmail's own `resultSizeEstimate`
from two one-unit list calls — so the notice can say how much lies beyond it
instead of only that something does.

### Unsubscribing

`POST /api/emails/unsubscribe` takes a **sender address**, never a URL. The
server finds that sender's recent mail in the user's own mailbox and reads the
unsubscribe endpoint out of its headers.

This matters: `List-Unsubscribe` values are written by whoever sent the mail. An
endpoint that fetched a URL from the request body would let any caller point the
server at `169.254.169.254` or anything else it can reach. Every URL is checked
for scheme, credentials and resolved address before a request goes out, and each
redirect hop is re-checked — see `lib/safe-fetch.ts`.

When the sender advertises RFC 8058 one-click (`List-Unsubscribe-Post:
List-Unsubscribe=One-Click`) the request is a POST with that body. A `mailto:`-only
sender is reported as needing the user's action, because sending mail on the
user's behalf would need a scope this app does not request.

### Cleanup and undo

Archive uses `messages.batchModify` to drop the `INBOX` label. Trash uses
`messages.trash`, pooled under the same concurrency cap. Both are reversed by
`POST /api/emails/undo`, offered as an Undo action on the confirmation toast.

Trash is applied per message, so a single stale id cannot fail the batch: the
route reports `{trashedCount, failed, messageIds}` where `messageIds` is only
what actually moved, and Undo targets exactly that list. It returns 502 only
when nothing moved at all.

Nothing is ever permanently deleted. Gmail keeps trashed mail for 30 days.

### Tokens

The Google access and refresh tokens live in the NextAuth JWT, inside an
encrypted HTTP-only cookie. They are **not** copied onto the session object, so
`/api/auth/session` does not hand them to page scripts. Route handlers read them
with `getToken()`.

The JWT callback refreshes the access token about a minute before it expires. If
the refresh token itself stops working, the session is stamped with
`RefreshAccessTokenError` and the client starts a fresh consent flow.

## Project structure

```
app/
  api/
    auth/[...nextauth]/route.ts   NextAuth handler
    emails/promotional/route.ts   Scan and group
    emails/archive/route.ts       Remove the INBOX label
    emails/trash/route.ts         Move to trash
    emails/undo/route.ts          Reverse either of the above
    emails/unsubscribe/route.ts   Look up and call a sender's endpoint
  page.tsx                        Landing page
  dashboard/  subscriptions/  cleanup/  settings/
  privacy/  terms/                Required for OAuth verification
  error.tsx  loading.tsx  not-found.tsx
components/
  layout/    AppShell, Header, Sidebar, MobileNav, LegalPage
  senders/   SenderToolbar (search + sort)
  ui/        Button, Card, Modal, Spinner, Toast
  marketing/ ConnectButton
hooks/
  useAuth, usePromotionalEmails, useSenderView
lib/
  auth.ts          NextAuth config and token refresh
  gmail.ts         Gmail calls and header parsing
  safe-fetch.ts    Outbound request guard
  concurrency.ts   Pooling, chunking, retry
  api-auth.ts      Token lookup and input validation for routes
  api-client.ts    Browser-side fetch wrapper
  summary.ts       Applies a completed cleanup to a scan summary
  format.ts        Relative time, byte sizes
  history.ts       localStorage activity log
middleware.ts      Edge protection for the app routes
```

Tests sit next to what they cover: `lib/*.test.ts`.

## Tests

The suite covers the layer where the bugs actually live — header parsing,
sender grouping, the SSRF guard, the retry predicate, and formatting:

```bash
npm test
```

Several tests encode specific bugs that were fixed, so they stay fixed:

- A sender's "last received" date must be the newest message, not whichever was
  processed last.
- An unsubscribe link must be picked up from any of a sender's messages.
- A 403 is only retried when its reason is a rate limit, and the retry predicate
  must read the shapes gaxios really throws (`status`, `response.data.error.errors`)
  rather than a hand-made `{code: 429}`.
- A sender whose mail is entirely archived still appears, so they stay
  unsubscribable, but contributes nothing to `inboxMessageIds`.
- `requireAccessToken` refreshes an expired token inline and returns
  `reauth_required` — not a 502 — when the refresh token itself is dead.
- Archiving shrinks only a sender's inbox subset and never removes the sender,
  while trashing removes the mail outright — `applyCleanupToSummary` is where
  that asymmetry lives, and getting it wrong would either hide a sender you can
  still unsubscribe from or re-send ids that were already actioned.
- `assertSafeUrl('https://[::ffff:127.0.0.1]/')` must be blocked. This one is
  asserted through the URL boundary on purpose: the WHATWG parser rewrites that
  host to `::ffff:7f00:1`, so a unit test on the dotted-quad spelling passes
  while the guard is fully bypassable.

## Going to production

1. Set `NEXTAUTH_URL` to your deployed `https://` origin.
2. Add `https://your-domain/api/auth/callback/google` to the OAuth client's
   authorized redirect URIs.
3. Generate a fresh `NEXTAUTH_SECRET` — do not reuse the development one.
4. Put your own contact details and legal entity into `app/privacy/page.tsx`;
   the placeholder paragraph says where.

Then the part that takes calendar time: `gmail.modify` is a **restricted scope**.
Until the app passes Google's OAuth verification *and* an annual CASA security
assessment, it is capped at 100 test users and shows an unverified-app warning.
Verification needs a hosted privacy policy, a homepage on a verified domain, a
demo video of the consent flow, and a written scope justification. Start it
early; it is the long pole, not the code.

### Known dependency advisories

`npm audit` reports two remaining issues (one moderate in `next`, one high in the
`postcss` that Next bundles). Both are only resolved by Next 16, a major upgrade
that also requires React 19. The `postcss` advisories concern attacker-controlled
CSS, and this app serves no third-party CSS. Revisit when you take the Next 16
upgrade deliberately.

## License

MIT
