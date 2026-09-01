import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/site";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of n4ma: acceptable use of the Service, intellectual property, payments and billing, liability, and how changes to these terms are handled.",
  alternates: { canonical: "/terms" },
};

const termsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms of Service - n4ma",
  url: `${SITE.url}/terms`,
  description:
    "n4ma's Terms of Service: how you may use the Service, your obligations, payments and billing, and our liability.",
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
    title: "Agreement to Terms",
    blocks: [
      'By accessing or using the services provided by n4ma at https://n4ma.online/ (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.',
    ],
  },
  {
    title: "Use of Service",
    blocks: [
      "You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:",
      {
        list: [
          "Use the Service in any way that violates any applicable law or regulation",
          "Use the Service to transmit any harmful, threatening, abusive, or otherwise objectionable material",
          "Attempt to gain unauthorized access to any portion of the Service",
          "Use the Service to infringe upon the rights of others",
          "Use any automated system to access the Service in a manner that sends more requests than a human can reasonably produce",
        ],
      },
    ],
  },
  {
    title: "Intellectual Property",
    blocks: [
      "The Service and its original content, features, and functionality are and will remain the exclusive property of n4ma. The Service is protected by copyright, trademark, and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.",
    ],
  },
  {
    title: "User Content",
    blocks: [
      "You retain ownership of any content you submit to or through the Service. By submitting content, you grant n4ma a non-exclusive, worldwide, royalty-free license to use, reproduce, and display such content in connection with operating the Service.",
    ],
  },
  {
    title: "Payments and Billing",
    blocks: [
      "Certain aspects of the Service may require payment. You agree to provide accurate billing information. All payments are non-refundable unless otherwise stated. We reserve the right to change our pricing at any time with reasonable notice.",
    ],
  },
  {
    title: "Termination",
    blocks: [
      "We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.",
      "Upon termination, your right to use the Service will cease immediately.",
    ],
  },
  {
    title: "Limitation of Liability",
    blocks: [
      "In no event shall n4ma, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:",
      {
        list: [
          "Your access to or use of (or inability to access or use) the Service",
          "Any conduct or content of any third party on the Service",
          "Any content obtained from the Service",
          "Unauthorized access, use, or alteration of your transmissions or content",
        ],
      },
    ],
  },
  {
    title: "Disclaimer",
    blocks: [
      'The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.',
    ],
  },
  {
    title: "Governing Law (EU Users)",
    blocks: [
      "For users in the European Union, these Terms shall be governed by and construed in accordance with applicable EU laws. Nothing in these Terms shall affect your statutory rights as a consumer under applicable EU consumer protection legislation.",
    ],
  },
  {
    title: "Governing Law",
    blocks: [
      "These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which n4ma operates, without regard to its conflict of law provisions.",
    ],
  },
  {
    title: "Changes to Terms",
    blocks: [
      "We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect.",
      "By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.",
    ],
  },
  {
    title: "Contact Us",
    blocks: [
      "If you have any questions about these Terms of Service, please contact us:",
      {
        list: ["By email: onsundevelopers@gmail.com", "By visiting: https://n4ma.online/"],
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={termsJsonLd} />
      <LegalDocument
        title="Terms of Service for n4ma"
        updated="Last Updated: September 1, 2026"
        sections={sections}
        disclaimer="This document was generated by PolicyGen and is provided for informational purposes only. It does not constitute legal advice. Please consult with a qualified attorney to ensure compliance with applicable laws."
      />
    </>
  );
}
