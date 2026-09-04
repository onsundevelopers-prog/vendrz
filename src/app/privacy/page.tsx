import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/site";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How n4ma collects, uses, and protects your data: what information we gather, how it's used, your rights under GDPR and CCPA, and how to contact us.",
  alternates: { canonical: "/privacy" },
};

const privacyJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy Policy - n4ma",
  url: `${SITE.url}/privacy`,
  description:
    "n4ma's privacy policy: how we collect, use, disclose, and safeguard your information, and your rights under GDPR and CCPA.",
  isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
  about: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    email: "onsundevelopers@gmail.com",
  },
  inLanguage: "en",
  dateModified: "2026-09-01",
};

const sections: LegalSection[] = [
  {
    title: "Introduction",
    blocks: [
      'n4ma ("we," "us," or "our") operates https://n4ma.online/ (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Service. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.',
    ],
  },
  {
    title: "Information We Collect",
    blocks: [
      "We may collect the following types of information:",
      {
        list: ["Name", "Email address", "Phone number", "Payment information"],
      },
      "We collect this information when you voluntarily provide it to us, when you use our Service, or through automated technologies.",
    ],
  },
  {
    title: "How We Use Your Information",
    blocks: [
      "We may use the information we collect for various purposes, including to:",
      {
        list: [
          "Provide, operate, and maintain our Service",
          "Improve, personalize, and expand our Service",
          "Understand and analyze how you use our Service",
          "Develop new products, services, features, and functionality",
          "Communicate with you for customer service, updates, and marketing purposes",
          "Process transactions and send related information",
          "Find and prevent fraud",
          "Comply with legal obligations",
        ],
      },
    ],
  },
  {
    title: "Third-Party Services",
    blocks: [
      "We may use third-party service providers to monitor and analyze the use of our Service, or assist with other business functions.",
      "Paid access (Team Plus) is a one-time purchase paid by Interac e-transfer, arranged by email and confirmed manually. We do not use an automated payment processor and never collect or store card, bank, or payment details on our servers.",
      "We offer social login options. When you log in via a social platform, we may receive profile information as permitted by your social account settings.",
    ],
  },
  {
    title: "Data Retention",
    blocks: [
      "We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.",
    ],
  },
  {
    title: "Data Security",
    blocks: [
      "The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.",
    ],
  },
  {
    title: "Your Rights Under GDPR (European Users)",
    blocks: [
      "If you are a resident of the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR). n4ma aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your personal data.",
      "You have the following rights:",
      {
        list: [
          { strong: "Right to Access", text: " — You have the right to request copies of your personal data." },
          { strong: "Right to Rectification", text: " — You have the right to request that we correct any information you believe is inaccurate or complete information you believe is incomplete." },
          { strong: "Right to Erasure", text: " — You have the right to request that we erase your personal data, under certain conditions." },
          { strong: "Right to Restrict Processing", text: " — You have the right to request that we restrict the processing of your personal data, under certain conditions." },
          { strong: "Right to Data Portability", text: " — You have the right to request that we transfer the data we have collected to another organization, or directly to you, under certain conditions." },
          { strong: "Right to Object", text: " — You have the right to object to our processing of your personal data, under certain conditions." },
        ],
      },
      "If you wish to exercise any of these rights, please contact us at onsundevelopers@gmail.com. We will respond to your request within 30 days.",
    ],
  },
  {
    title: "Your Rights Under CCPA (California Residents)",
    blocks: [
      "If you are a California resident, you have specific rights regarding your personal information under the California Consumer Privacy Act (CCPA).",
      "You have the right to:",
      {
        list: [
          { strong: "Know", text: " — Request that we disclose what personal information we collect, use, and disclose about you." },
          { strong: "Delete", text: " — Request that we delete your personal information, subject to certain exceptions." },
          { strong: "Opt-Out", text: " — Opt out of the sale of your personal information. We do not sell personal information." },
          { strong: "Non-Discrimination", text: " — Not be discriminated against for exercising your CCPA rights." },
        ],
      },
      "To exercise your rights, contact us at onsundevelopers@gmail.com. We will verify your identity before processing your request and respond within 45 days.",
    ],
  },
  {
    title: "CalOPPA Compliance",
    blocks: [
      "In accordance with the California Online Privacy Protection Act (CalOPPA), we agree to the following:",
      {
        list: [
          "Users can visit our site anonymously.",
          'Our Privacy Policy link includes the word "Privacy" and can be easily found on our home page.',
          "Users will be notified of any privacy policy changes on this page.",
          "Users can change their personal information by contacting us at onsundevelopers@gmail.com.",
        ],
      },
      "We honor Do Not Track signals and do not track, plant cookies, or use advertising when a Do Not Track browser mechanism is in place.",
    ],
  },
  {
    title: "Changes to This Privacy Policy",
    blocks: [
      "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \"Last Updated\" date.",
      "You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.",
    ],
  },
  {
    title: "Contact Us",
    blocks: [
      "If you have any questions about this Privacy Policy, please contact us:",
      {
        list: ["By email: onsundevelopers@gmail.com", "By visiting: https://n4ma.online/"],
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={privacyJsonLd} />
      <LegalDocument
        title="Privacy Policy for n4ma"
        updated="Last Updated: September 1, 2026"
        sections={sections}
        disclaimer="This document was generated by PolicyGen and is provided for informational purposes only. It does not constitute legal advice. Please consult with a qualified attorney to ensure compliance with applicable laws."
      />
    </>
  );
}
