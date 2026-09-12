/* ------------------------------------------------------------------ */
/*  Long-form content - written for humans and search engines.        */
/*                                                                     */
/*  Plain-language explainers around the core questions customers      */
/*  actually type into Google: why software spending leaks, how to     */
/*  audit contracts without a procurement team, and what makes         */
/*  evidence-first analysis different. No jargon, no invented claims   */
/*  - every paragraph describes what N4MA really does.                 */
/* ------------------------------------------------------------------ */

export function LearnMore() {
  return (
    <section className="border-t border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <p className="text-center text-[12px] font-[510] tracking-[-0.01em] text-faint">
          Learn
        </p>
        <h2 className="mt-4 text-center text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
          Why software spending leaks, and how to stop it.
        </h2>

        <div className="mt-12 space-y-10 text-[15px] font-normal leading-[1.7] tracking-[-0.011em] text-faint">
          <div className="space-y-4">
            <p>
              Every company buys software, and almost every company overpays
              for it - not because anyone is careless, but because the terms
              live in documents nobody re-reads. The auto-renewal clause is on
              page 9 of a PDF signed two years ago. The 6% annual escalation is
              in an order form. The cancellation deadline passed last Tuesday,
              quietly, in an inbox nobody was watching. None of this shows up
              in accounting software, because accounting software records what
              you spent - not what you agreed to spend next.
            </p>
            <p>
              The leaks are recurring by nature. A missed cancellation window
              charges you for another full year. An escalation clause compounds
              annually. Unused seats keep billing until someone notices. That
              is what makes them expensive: they are not one-off mistakes, they
              are subscriptions to your own inattention.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              Why reading contracts is an AI job (with a human decision)
            </h3>
            <p>
              A contract review is document work: find the renewal term, the
              notice period, the escalation percentage, the fee schedule, the
              seat definitions - then compare them against what you actually
              pay. It is slow for humans and well-suited for AI. N4MA does the
              reading: it extracts the terms from your contracts, invoices, and
              vendor correspondence, then checks them against each other.
            </p>
            <p>
              But a number without a source is just a guess, and a financial
              conclusion invented by a model is worse than none. That is why
              N4MA is evidence-first: every finding cites the exact clause,
              document page, invoice line, or message it came from, and every
              savings estimate is calculated from your own terms - your
              escalation percentage, applied to what you actually pay. You can
              open the evidence and check the math before you act. The AI reads
              the document; the evidence makes the case; you make the decision.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              What N4MA looks for
            </h3>
            <p>
              The review covers the recurring leaks that hide in business
              software agreements:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-fg">Auto-renewals</span> - the
                clause renews the deal at full price unless you cancel by a
                date nobody tracked. N4MA extracts the date and tracks it.
              </li>
              <li>
                <span className="font-medium text-fg">Cancellation deadlines</span>{" "}
                - the notice window is often 30-90 days before renewal. Miss it
                and the decision is made for you.
              </li>
              <li>
                <span className="font-medium text-fg">Price increases</span> -
                annual escalation percentages, CPI-linked bumps, and
                &ldquo;upon renewal&rdquo; repricing rights buried in the terms.
              </li>
              <li>
                <span className="font-medium text-fg">Hidden fees</span> -
                onboarding fees, true-up charges, minimum-commitment shortfalls,
                and invoice lines that don&rsquo;t match the signed rate.
              </li>
              <li>
                <span className="font-medium text-fg">Unused licenses</span> -
                seats billed for people who left, tiers sized for a team you no
                longer have.
              </li>
              <li>
                <span className="font-medium text-fg">Duplicate software</span> -
                two tools doing the same job because two teams bought
                separately.
              </li>
              <li>
                <span className="font-medium text-fg">Billing anomalies</span> -
                invoices that disagree with the contract, in either
                direction.
              </li>
            </ul>
            <p>
              Each finding ships with a recommended next action - renew,
              renegotiate, or cancel - and the estimated annual impact of
              taking it. N4MA never contacts a vendor or changes anything on
              your behalf; it prepares the action, you approve it.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              Who N4MA is for
            </h3>
            <p>
              N4MA is for any business that buys software without a dedicated
              procurement department: founders and finance leads tracking SaaS
              renewals, operations teams managing vendor contracts, and IT or
              procurement teams that need evidence-backed numbers before a
              renewal decision. If you have ever said &ldquo;when does this
              contract renew?&rdquo; and nobody knew - that is the job N4MA
              does.
            </p>
            <p>
              Start with a free review: upload one contract or invoice and see
              what comes back in about two minutes, no account required. Then
              connect Gmail, Google Drive, or Slack read-only to let N4MA find
              the vendor documents you didn&rsquo;t upload.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
