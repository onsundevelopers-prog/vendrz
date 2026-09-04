/* ------------------------------------------------------------------ */
/*  Long-form content - written for humans and search engines.        */
/*                                                                     */
/*  Plain-language explainers around the core questions customers      */
/*  actually type into Google: what software spend analysis is, how to */
/*  find hidden fees, and how automatic renewals work. No jargon,      */
/*  no invented claims - every paragraph describes what n4ma really    */
/*  does with your documents.                                          */
/* ------------------------------------------------------------------ */

export function LearnMore() {
  return (
    <section className="border-t border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <p className="text-center text-[12px] font-[510] tracking-[-0.01em] text-faint">
          Learn
        </p>
        <h2 className="mt-4 text-center text-balance text-4xl font-[510] leading-[1.05] tracking-[-0.022em] text-fg sm:text-5xl">
          What is software spend analysis, really?
        </h2>

        <div className="mt-12 space-y-10 text-[15px] font-normal leading-[1.7] tracking-[-0.011em] text-faint">
          <div className="space-y-4">
            <p>
              Every business pays for tools and services it barely thinks about:
              software subscriptions, cloud hosting, marketing platforms,
              insurance, and a dozen other vendors with invoices that arrive on
              autopilot. Most of those agreements were signed once, years ago,
              and never looked at again. Software spend analysis is the practice
              of actually reviewing that spending - not just this month&apos;s
              invoices, but the contracts underneath them - to find where money
              is quietly leaking out.
            </p>
            <p>
              The leaks are rarely a single big line item. They are small,
              compounding things: an annual price escalation clause that raises
              your bill a few percent every year on a growing base, a
              subscription that auto-renews for another full term because nobody
              gave notice in time, seats you pay for that nobody uses, and two
              vendors doing the same job. Individually each one looks small.
              Together they can add up to a meaningful share of your annual
              spend - and because they are written into contracts you signed,
              they keep happening until someone reads the fine print.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              How to find hidden fees in your contracts
            </h3>
            <p>
              You don&apos;t need to be a lawyer to find hidden fees - you need to
              know where they hide. In our experience reviewing vendor
              agreements, the same patterns show up again and again:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-fg">Automatic renewal clauses</span>{" "}
                - the contract renews for another full term unless you cancel in
                writing before a deadline that is usually 30 to 90 days before
                the renewal date.
              </li>
              <li>
                <span className="font-medium text-fg">Annual price escalations</span>{" "}
                - a fixed percentage increase every year, sometimes with no cap,
                which compounds on top of last year&apos;s already-increased price.
              </li>
              <li>
                <span className="font-medium text-fg">Unused seats and licenses</span>{" "}
                - you keep paying for the headcount you had two years ago, not
                the team you have today.
              </li>
              <li>
                <span className="font-medium text-fg">Duplicate tools</span> - two
                or more vendors providing the same service, each with its own
                subscription and renewal.
              </li>
              <li>
                <span className="font-medium text-fg">Cancellation windows you missed</span>{" "}
                - the date to give notice has already passed, so you are locked
                into another term whether you want it or not.
              </li>
            </ul>
            <p>
              n4ma reads your uploaded contracts and invoices with AI and checks
              for exactly these patterns. Every finding links back to the exact
              sentence in your document, so you can verify it yourself instead of
              trusting a black box.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              Why contracts auto-renew - and how to stop it
            </h3>
            <p>
              Automatic renewal is written into most subscription agreements for
              the vendor&apos;s benefit: if you forget to cancel, you keep paying,
              and the vendor avoids the cost of winning you back. The term is
              almost never in the headline of the contract - it lives in a
              clause that says something like &quot;this agreement shall
              automatically renew for successive terms unless either party
              provides written notice of non-renewal at least N days prior to
              the expiration of the then-current term.&quot;
            </p>
            <p>
              To stop an auto-renewal you have to act before that notice
              deadline, in writing, and usually to a specific address. n4ma
              extracts your renewal date and your cancellation deadline from the
              document, tells you how many days you have left, and drafts the
              cancellation notice for you to review - you send it yourself. No
              surprise renewals, and no more paying for a second term you never
              wanted.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[19px] font-[510] tracking-[-0.016em] text-fg">
              How the free contract review works
            </h3>
            <p>
              The review is free, and you don&apos;t need an account to see your
              results. Upload a PDF or DOCX - a master service agreement, a
              subscription terms page, an invoice, an order form - and n4ma
              reads it, extracts the key terms, and builds a report with a risk
              score, a list of findings with evidence, and a range of potential
              savings. The whole thing usually finishes in under a minute, and
              your document is encrypted and never used to train models.
            </p>
            <p>
              If you create an account afterwards, the same analysis is
              transferred to your workspace so you can track renewals over time
              and get alerts before deadlines slip. If you don&apos;t, your scan
              expires after 14 days and is deleted. Either way, the review itself
              costs nothing and commits you to nothing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
