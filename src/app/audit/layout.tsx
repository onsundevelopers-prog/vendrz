import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Free vendor review",
  description:
    "Upload a contract or invoice and get evidence-backed findings in about two minutes - auto-renewals, cancellation deadlines, price increases, hidden fees, and more, each with its source document. No account required.",
  alternates: { canonical: "/audit" },
};

export default function AuditLayout({ children }: { children: ReactNode }) {
  return children;
}
