import type { ReactNode } from "react";
import { ClerkScope } from "@/components/auth/ClerkScope";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}