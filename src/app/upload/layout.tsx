import type { Metadata } from "next";
import { SITE } from "@/lib/site";

/** /upload is a client component, so metadata lives in this server layout. */
export const metadata: Metadata = {
  title: "Upload Your Contracts for AI Analysis",
  description:
    "Upload PDF or DOCX contracts and invoices and let n4ma's AI extract renewal dates, cancellation deadlines, price escalations, and savings opportunities - with evidence for every finding.",
  alternates: { canonical: "/upload" },
  openGraph: {
    title: "Upload Your Contracts for AI Analysis",
    description:
      "Drop in your contracts and get renewal dates, hidden fees, and savings opportunities - with evidence for every finding.",
    url: `${SITE.url}/upload`,
  },
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
