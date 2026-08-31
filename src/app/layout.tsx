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
          <ClerkProvider
            appearance={{
              theme: dark,
              variables: {
                // Pure black surfaces - no grey panels anywhere in Clerk.
                colorPrimary: "#ffffff",
                colorBackground: "#000000",
                colorForeground: "#ffffff",
                colorMuted: "#d4d4d8",
                colorMutedForeground: "#d4d4d8",
                colorInput: "#000000",
                colorInputForeground: "#ffffff",
                colorBorder: "rgba(255,255,255,0.18)",
                borderRadius: "0.75rem",
              },
              elements: {
                footerActionLink: "text-white",
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
