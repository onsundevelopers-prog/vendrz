import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { ClerkScope } from "@/components/auth/ClerkScope";

/** /audit is a client component, so metadata lives in this server layout. */
export const metadata: Metadata = {
  title: "Free Vendor Spend Review - Find Hidden Fees",
  description:
    "Run a free vendor spend review. Upload a PDF or DOCX and n4ma's AI finds hidden fees, automatic renewals, price increases, and savings in your contracts and invoices. Results in minutes, no signup required.",
  alternates: { canonical: "/audit" },
  openGraph: {
    title: "Free Vendor Spend Review - Find Hidden Fees",
    description:
      "Upload a contract and see where you're overpaying: hidden fees, automatic renewals, and price increases. Free review, no signup.",
    url: `${SITE.url}/audit`,
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}