import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for Noma - how we collect, use, and protect your data.",
};

const sections = [
  {
    title: "1. What we collect",
    body: [
      "Account information: when you sign up or sign in, we receive your name, email address, and authentication details through Clerk, our identity provider.",
      "Documents you upload: contract files and other business documents you submit for spend analysis.",
      "Payment information: if you purchase a plan, payment processing is handled by PayPal. We do not store credit card numbers; we only keep the plan and subscription status needed to grant access.",
    ],
  },
  {
    title: "2. How we use your data",
    body: [
      "To provide the service: analyzing your uploaded documents to surface renewals, risks, savings opportunities, and spend insights.",
      "To manage your account and subscription: authentication, billing, and access to paid features.",
      "To improve the product: aggregate, non-identifying usage patterns.",
    ],
  },
  {
    title: "3. AI processing",
    body: [
      "Uploaded documents may be processed by AI services (Google Gemini) to extract and summarize contract terms. Documents are processed only to deliver the analysis you requested and are not used to train AI models.",
    ],
  },
  {
    title: "4. Data processors",
    body: [
      "We use trusted third-party services to operate Noma: Clerk (authentication), Supabase (data storage), Google AI (document analysis), PayPal (payments), and Vercel (hosting). Each processor handles data only to provide its service to us.",
    ],
  },
  {
    title: "5. Data retention",
    body: [
      "We retain your account data and analysis results for as long as your account is active. You can delete documents or your account at any time by contacting us, and we will remove your data within a reasonable period.",
    ],
  },
  {
    title: "6. Security",
    body: [
      "We protect your data with encryption in transit, authentication on all API access, and strict access controls. No method of transmission is 100% secure, but we work to protect your information.",
    ],
  },
  {
    title: "7. Your rights",
    body: [
      "You can access, correct, export, or delete your personal data at any time. Contact us using the details below and we will respond within 30 days.",
    ],
  },
  {
    title: "8. Contact",
    body: [
      "Questions about this policy or your data? Email us at privacy@noma.app.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm uppercase tracking-widest text-zinc-500">
          Noma
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-zinc-400">
          Effective date: August 30, 2026
        </p>
        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="leading-relaxed text-zinc-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
