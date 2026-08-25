import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

/* When Clerk keys are present the app is Clerk-authenticated; without them
   the app runs in demo mode with the localStorage accounts. */
const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vendor Watchtower — Vendor Spend Intelligence Platform",
    template: "%s · Vendor Watchtower",
  },
  description:
    "Know where your company's money is going — and find where you can save. Vendor Watchtower turns transactions, invoices, and contracts into spend intelligence: renewals, waste, billing anomalies, and savings opportunities. Run a free audit, no signup required.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} antialiased`}>
      <body>
        <div
          aria-hidden="true"
          className="noise-grain pointer-events-none fixed inset-0 z-[100]"
        />
        {isClerkEnabled ? (
          <ClerkProvider
            appearance={{
              theme: dark,
              variables: {
                colorPrimary: "#34d399",
                colorBackground: "#0d0d11",
                colorForeground: "#f4f4f5",
                colorMuted: "#a1a1aa",
                colorInput: "rgba(255,255,255,0.04)",
                colorInputForeground: "#f4f4f5",
                borderRadius: "0.75rem",
              },
              elements: {
                card: "shadow-glow",
                footerActionLink: "text-emerald-400",
                formButtonPrimary: "bg-white text-black hover:bg-zinc-200",
                socialButtonsBlockButton: "border-white/15",
              },
            }}
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
