import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Scan a Contract", href: "/upload" },
      { label: "Overview", href: "/dashboard" },
      { label: "Vendors", href: "/dashboard/companies" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
      { label: "Log in", href: "/auth?mode=login" },
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
              n4ma is the AI that finds hidden fees and wasted spending in the
              everyday tools your business already pays for - so you can cancel
              what you don&apos;t need and negotiate the rest.
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
          <p>© {new Date().getFullYear()} n4ma. All rights reserved.</p>
          <p>Encrypted in transit and at rest · Your contract is never shared or sold</p>
        </div>
      </div>
    </footer>
  );
}
