import type { Metadata } from 'next'
import { LegalPage } from '@/components/layout/LegalPage'
import { APP_NAME } from '@/utils/constants'

export const metadata: Metadata = {
  title: 'Terms of service',
  description: `Terms for using ${APP_NAME}.`,
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" lastUpdated="12 September 2026">
      <section>
        <h2>What this is</h2>
        <p>
          {APP_NAME} is a tool that acts on your Gmail account at your direction: it lists
          promotional senders, asks senders to stop mailing you, and moves mail out of your inbox.
          It is provided as open-source software under the MIT licence.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          You need a Google account and must grant the Gmail scope described in the{' '}
          <a href="/privacy">privacy policy</a>. You are responsible for the actions you confirm in
          this application. Cleanup actions are applied to whatever you select, in bulk, and
          although both archiving and trashing are reversible, the reversal is your responsibility
          to invoke.
        </p>
      </section>

      <section>
        <h2>Unsubscribing</h2>
        <p>
          An unsubscribe request goes to the endpoint the sender published in its own message
          headers. Whether the sender honours it is entirely up to them. {APP_NAME} reports what
          the endpoint answered; it cannot guarantee that mail stops arriving, and a request that
          returned success is not a promise about the sender&apos;s future behaviour.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Use it only on accounts you are authorised to access.</li>
          <li>
            Do not use it to send traffic to third-party endpoints for any purpose other than
            unsubscribing yourself.
          </li>
          <li>Do not attempt to work around the request limits or Google&apos;s API quotas.</li>
        </ul>
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          The software is provided &ldquo;as is&rdquo;, without warranty of any kind, express or
          implied. It talks to Gmail and to senders&apos; servers, and either can fail, rate-limit,
          or behave unexpectedly. To the maximum extent permitted by law, the authors and operators
          are not liable for any claim, damages, or loss — including lost or mislabelled mail —
          arising from its use.
        </p>
        <p>
          Mail moved to trash is retained by Gmail for 30 days before Google deletes it. Recovering
          it within that window is possible; after it, it is not.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          These terms may change as the software changes. The date at the top reflects the current
          version. Continued use after a change constitutes acceptance of it.
        </p>
      </section>
    </LegalPage>
  )
}
