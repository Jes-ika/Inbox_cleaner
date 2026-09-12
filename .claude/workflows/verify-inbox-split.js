export const meta = {
  name: 'verify-inbox-split',
  description: 'Check the discovery-vs-action scope refactor for correctness and dead ends',
  phases: [{ title: 'Check refactor' }],
}

const REPO = 'C:/Users/jesik/Desktop/inboxcleaner'

const BASE = `
Repo: ${REPO}. Next.js 15 + NextAuth v4 + Gmail API.

Commit dd239b2 made a scope refactor. Read it with:
  git -C ${REPO} show dd239b2

The change: Gmail discovery is \`category:promotions\` (unscoped), and the scan
now records per-message inbox membership. Each sender carries BOTH:
  - messageIds / emailCount / sizeBytes      (everything in Promotions)
  - inboxMessageIds / inboxCount / inboxSizeBytes  (the subset still in INBOX)
Cleanup acts only on the inbox subset; Subscriptions lists every sender.

Why: scoping the single shared query to \`in:inbox\` made archive counts truthful
but hid every sender whose mail was already archived, so they became
unsubscribable-only-while-in-inbox. Tracking membership per message was meant to
get both properties at once.

You may RUN code. Node 24 supports --experimental-strip-types on .mts files, so
you can import lib files directly or mock googleapis in a vitest probe.
npm test / npm run typecheck / npm run lint / npm run build all work.

Already verified green: typecheck, lint, 102 tests across 5 files, clean
production build, and a signed-out smoke test (public pages 200, app routes 307,
API routes 401). Real Google credentials are absent by design, so no signed-in
path is runnable end to end. Do not report any of that.

IMPORTANT: clean up any scratch files you create — do not leave anything in the
repo working tree. Use your own scratchpad directory.

Report ONLY real defects in the CURRENT code. "The refactor holds" is a valid
and expected answer. At most 3 findings.
`

const SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['holds', 'problems-found'] },
    checked: {
      type: 'array',
      description: 'One line per thing you verified, saying HOW',
      items: { type: 'string' },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['title', 'file', 'line', 'severity', 'evidence', 'fix'],
      },
    },
  },
  required: ['verdict', 'checked', 'findings'],
}

const CHECKS = [
  {
    key: 'data-correctness',
    prompt: `${BASE}
SCOPE: the data layer — lib/gmail.ts, types/index.ts, utils/constants.ts, and
app/api/emails/*.

Verify:
1. \`inInbox\` is read correctly. Does \`messages.get\` with \`format: 'metadata'\`
   actually return \`labelIds\`? Check the googleapis types and the Gmail API
   reference. If it does not, every message would be treated as archived and
   Cleanup would show nothing at all — the worst possible outcome of this change.
2. groupMessagesBySender's accumulation is consistent: emailCount vs
   inboxCount, sizeBytes vs inboxSizeBytes, messageIds vs inboxMessageIds
   ordering, and the scan's summary totals (totalEmails/inboxEmails,
   totalSizeBytes/inboxSizeBytes). Build a probe with a mix of inbox and
   archived messages across several senders and check every field adds up.
3. \`truncated\` still means what the dashboard says it means now that discovery
   is unscoped — the scan limit is 500 and an unscoped Promotions category is
   typically much larger than the inbox subset. Is the dashboard's truncation
   notice still accurate? Is DEFAULT_SCAN_LIMIT now covering proportionally less
   of what the user cares about (their inbox), and does any screen mislead
   because of it?
4. findUnsubscribeTarget's query is \`from:"X" category:promotions\`. Confirm that
   matches the privacy policy text in app/privacy/page.tsx, and that a sender
   discoverable by the UI can always be found by it.
5. The archive route returns a plain count while trash returns
   {trashedCount, failed, messageIds}. Check app/cleanup/page.tsx reads BOTH
   shapes correctly — particularly \`result.messageIds ?? messageIds\` when
   archiving, where messageIds is absent.`,
  },
  {
    key: 'ui-coherence',
    prompt: `${BASE}
SCOPE: the screens — app/cleanup/page.tsx, app/subscriptions/page.tsx,
app/dashboard/page.tsx, hooks/useSenderView.ts, hooks/usePromotionalEmails.ts.

Verify:
1. Cleanup's \`inboxSenders\` adapter overwrites emailCount/messageIds/sizeBytes
   with the inbox values. Check nothing downstream still reads the total fields
   and gets a mismatch — search for every use of emailCount, messageIds and
   sizeBytes on that page and in useSenderView, and check removeMessages in
   usePromotionalEmails, which updates the TOTAL fields after a cleanup. Does
   inboxCount/inboxMessageIds get updated there too? If not, acting on a sender
   then acting again would send already-trashed ids.
2. Walk the Subscriptions -> "Clean up N" -> Cleanup flow for a sender with
   inbox mail, and confirm the filter lands on them with the right count.
3. Walk it for a sender whose mail is ALL archived: the link should not render
   (an "Inbox clear" label instead), and navigating to
   /cleanup?sender=<that address> directly should show the explanatory message,
   not "No senders match this filter". Check \`linkedSenderIsArchived\` actually
   evaluates true there — note the query param is compared against
   \`sender.email\` exactly, so consider case and URL encoding.
4. Dashboard now shows inboxEmails for "Promotional in inbox" and
   totalSizeBytes for "Promotional mail total". Are the three tiles internally
   consistent — does "Active senders" (totalSenders) belong beside an inbox
   count, and could a user read the tiles as contradicting each other?
5. Selection behaviour: the header "select all listed senders" checkbox
   replaces the selection with the visible list. Combined with acting on the
   intersection of selected and visible, is there any sequence of filter +
   select-all + act that surprises the user or acts on something not shown?`,
  },
]

phase('Check refactor')
log('Two checks over the discovery/action scope split')

const results = await parallel(
  CHECKS.map((c) => () =>
    agent(c.prompt, { label: `check:${c.key}`, phase: 'Check refactor', schema: SCHEMA })
  )
)

const live = results.filter(Boolean)
const findings = []
const checked = []

live.forEach((r, i) => {
  for (const line of r.checked || []) checked.push(`[${CHECKS[i].key}] ${line}`)
  for (const f of r.findings || []) findings.push({ ...f, check: CHECKS[i].key })
})

const RANK = { blocker: 0, major: 1, minor: 2 }
findings.sort((a, b) => (RANK[a.severity] ?? 3) - (RANK[b.severity] ?? 3))

log(`${live.length}/2 reported; ${findings.length} findings`)

return {
  verdicts: live.map((r, i) => ({ check: CHECKS[i].key, verdict: r.verdict })),
  checked,
  findings,
}
