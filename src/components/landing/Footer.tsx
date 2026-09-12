import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#product" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Free vendor review", href: "/audit" },
      { label: "Log in", href: "/auth?mode=login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-[13px] font-normal leading-relaxed tracking-[-0.011em] text-faint">
              {SITE.name} is the AI financial watchdog for business software. It
              reads the contracts, invoices, and subscriptions behind your
              software spending, finds the leaks, and backs every finding with
              evidence from your own documents.
            </p>
          </div>
          <div className="flex gap-20">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[12px] font-[510] tracking-[-0.01em] text-faint">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-faint transition-colors hover:text-fg"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-[11.5px] font-normal tracking-[-0.01em] text-ash sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Encrypted in transit and at rest · Read-only connections · Your documents are never shared or sold</p>
        </div>
      </div>
    </footer>
  );
}
