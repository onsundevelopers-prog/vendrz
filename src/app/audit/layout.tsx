import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { ClerkScope } from "@/components/auth/ClerkScope";

/** /audit is a client component, so metadata lives in this server layout. */
export const metadata: Metadata = {
  title: "Find Hidden Fees & Wasted Software Spending",
  description:
    "Free AI review of your contracts, invoices, and subscriptions. N4MA finds hidden fees, auto-renewals, price increases, and wasted spend - with evidence for every finding. Results in minutes, no signup required.",
  alternates: { canonical: "/audit" },
  openGraph: {
    title: "Find Hidden Fees & Wasted Software Spending",
    description:
      "See where your money is leaking: hidden fees, auto-renewals, and price increases in the software you already pay for. Free review, no signup.",
    url: `${SITE.url}/audit`,
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}