import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

/* When Clerk keys are present the app is Clerk-authenticated; without them
   the app runs in demo mode with the localStorage accounts. */
const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Derive the Clerk instance origin from the publishable key so the browser
 * can preconnect before Clerk's script tag is injected. Publishable keys
 * encode `<frontend-api-host>$<instance-id>` as base64.
 */
const clerkOrigin = isClerkEnabled
  ? (() => {
      try {
        const encoded = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!.replace(/^pk_(test|live)_/, "");
        const decoded = Buffer.from(encoded, "base64").toString("utf-8");
        const host = decoded.split("$")[0];
        return host ? `https://${host}` : null;
      } catch {
        return null;
      }
    })()
  : null;

// Inter Variable - the full 100-900 axis, so the Linear weights (400 / 510 /
// 590) exist alongside the classic ones. OpenType features (cv01 / ss03 / zero)
// are enabled globally on body in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Berkeley Mono stand-in for code-adjacent metadata (kbd hints, mono labels).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "n4ma - Vendor Spend Analysis",
    template: "%s · n4ma",
  },
  description:
    "Know where your company's money is going - and find where you can save. n4ma turns transactions, invoices, and contracts into spend analysis: renewals, waste, billing anomalies, and savings opportunities. Run a free review, no signup required.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} antialiased`}>
      <body>
        {isClerkEnabled ? (
          <>
            {/* Warn the browser about Clerk's origins up front so the auth
                bundle, session calls, and avatar images don't pay a DNS +
                TLS handshake on first use. Next.js hoists <link> tags from
                anywhere in the tree into <head>. */}
            {clerkOrigin && (
              <link rel="preconnect" href={clerkOrigin} crossOrigin="anonymous" />
            )}
            <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
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
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
