import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkScope } from "@/components/auth/ClerkScope";

export const metadata: Metadata = {
  title: "Contract review",
  description:
    "Upload contracts and invoices and N4MA extracts renewal dates, cancellation deadlines, escalations, and fees - every finding backed by its source document.",
  alternates: { canonical: "/upload" },
};

/* The upload page consumes the Clerk session client-side (useUser), so it
   needs the per-route Clerk provider - the root layout intentionally ships
   no Clerk JS. ClerkScope is inert (renders children as-is) when Clerk
   keys are absent, keeping demo mode working. */
export default function UploadLayout({ children }: { children: ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
