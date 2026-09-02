import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ClerkMounted } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  ClerkScope - per-route Clerk provider.                             */
/*                                                                     */
/*  The root layout deliberately has NO ClerkProvider, so public pages  */
/*  (/, /pricing, /privacy, /terms, ...) ship zero Clerk JavaScript:    */
/*  no clerk-js, no @clerk/ui, no @clerk/nextjs client runtime. Clerk   */
/*  loads only on routes that actually consume auth, by wrapping them   */
/*  in this component from their own layout.                            */
/*                                                                     */
/*  <ClerkMounted> marks the subtree so components like the landing     */
/*  navbar can tell "am I inside a provider?" without calling Clerk     */
/*  hooks (which throw outside a provider).                             */
/* ------------------------------------------------------------------ */

const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ClerkScope({ children }: { children: ReactNode }) {
  if (!isClerkEnabled) return <>{children}</>;

  return (
    <>
      {/* Avatars and user images come from Clerk's CDN - warm the origin
          before the dashboard header asks for them. */}
      <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
      <ClerkMounted>
        <ClerkProvider
          dynamic
          appearance={{
            theme: dark,
            variables: {
              // Linear midnight surfaces - no grey panels anywhere in Clerk.
              colorPrimary: "#e4e4e7",
              colorBackground: "#08090a",
              colorForeground: "#ffffff",
              colorMuted: "#d0d6e0",
              colorMutedForeground: "#8a8f98",
              colorInput: "#0f1011",
              colorInputForeground: "#ffffff",
              colorBorder: "#23252a",
              borderRadius: "0.375rem",
            },
            elements: {
              footerActionLink: "text-muted",
              formButtonPrimary: "bg-acid text-[#08090a] hover:bg-[#ececef]",
              socialButtonsBlockButton: "border-line",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </ClerkMounted>
    </>
  );
}