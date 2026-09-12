import type { Metadata } from 'next'
import { LegalPage } from '@/components/layout/LegalPage'
import { APP_NAME, GMAIL_SCOPES } from '@/utils/constants'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `How ${APP_NAME} handles your Gmail data.`,
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" lastUpdated="12 September 2026">
      <section>
        <p>
          {APP_NAME} helps you unsubscribe from newsletters and clear promotional mail out of
          your Gmail inbox. This page describes exactly what it accesses, what it does with it,
          and what it keeps. Google requires an accurate disclosure here before an application may
          request the scope below, and it is the description this application is held to.
        </p>
      </section>

      <section>
        <h2>What we access</h2>
        <p>
          Signing in grants a single Google OAuth scope:{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">{GMAIL_SCOPES[0]}</code>. It
          allows reading your messages and changing their labels. Within that scope we read:
        </p>
        <ul>
          <li>
            Message metadata from your Promotions category — the <code>From</code>,{' '}
            <code>List-Unsubscribe</code> and <code>List-Unsubscribe-Post</code> headers, plus each
            message&apos;s date, size estimate, identifier, and whether it is still in your inbox.
          </li>
          <li>Your email address and display name, from your Google profile.</li>
        </ul>
        <p>
          We do not read message bodies, attachments, or any mail outside your Promotions category.
          The same scope is used when looking up a sender&apos;s unsubscribe link.
        </p>
      </section>

      <section>
        <h2>What we do with it</h2>
        <ul>
          <li>
            Group your promotional mail by sender so a page can show counts, dates and sizes.
          </li>
          <li>
            Remove the inbox label, or move messages to trash, when you ask for that explicitly and
            confirm it. Cleanup only ever touches mail still in your inbox.
          </li>
          <li>
            Send an unsubscribe request to the endpoint a sender publishes in its own{' '}
            <code>List-Unsubscribe</code> header, when you ask for that.
          </li>
        </ul>
        <p>
          Your mail is never used to train models, build profiles, target advertising, or for any
          purpose other than the feature you invoked.
        </p>
      </section>

      <section>
        <h2>What we keep</h2>
        <p>
          No message data is written to a database. Mail is read while a request is in flight, used
          to build the response, and discarded when the request ends. There is no server-side copy
          of your inbox, and no analytics on its contents.
        </p>
        <p>Two things do persist:</p>
        <ul>
          <li>
            <strong>Your session.</strong> Google access and refresh tokens are stored in an
            encrypted, HTTP-only cookie in your browser. They are never exposed to page scripts.
            The session expires after 30 days.
          </li>
          <li>
            <strong>An activity log.</strong> A short record of cleanups and unsubscribes is stored
            in your browser&apos;s local storage, on your device only. It never reaches our server.
            Settings has a button that deletes it.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <p>
          Nobody. Your mail is not sold, shared, or handed to any third party. The one outbound
          request we make on your behalf is the unsubscribe request to a sender&apos;s own
          published endpoint, and it carries no information about you beyond what that endpoint
          already encodes in the URL the sender chose.
        </p>
      </section>

      <section>
        <h2>Revoking access</h2>
        <p>
          Disconnecting in Settings ends your session and deletes the cookie holding your tokens.
          To withdraw the grant entirely, remove {APP_NAME} from{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            your Google account&apos;s third-party access list
          </a>
          . Because we store no copy of your mail, there is nothing further to delete.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          {/* Operator detail: fill this in before requesting Google OAuth verification. */}
          Questions about this policy should go to the address published on the repository or
          deployment you obtained this application from. If you are deploying {APP_NAME} yourself,
          replace this paragraph with your own contact address and legal entity — Google&apos;s
          verification review requires a reachable owner.
        </p>
      </section>
    </LegalPage>
  )
}
