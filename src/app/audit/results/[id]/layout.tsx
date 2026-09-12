import type { ReactNode } from "react";
import { ClerkScope } from "@/components/auth/ClerkScope";

/* The audit results page consumes the Clerk session client-side
   (useAuthUser -> useUser), so this segment needs the per-route Clerk
   provider. Inert when Clerk keys are absent (demo mode). */
export default function AuditResultsLayout({ children }: { children: ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
