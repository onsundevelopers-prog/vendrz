import type { ContractRecord } from "./types";

/** Seeded sample portfolio shown in new accounts (clearly marked as samples). */
export const SAMPLE_CONTRACTS: ContractRecord[] = [
  {
    id: "c-slack",
    vendorName: "Slack",
    category: "Communications",
    annualSpend: 31800,
    renewalDate: daysFromNow(41),
    cancellationDeadline: daysFromNow(12),
    autoRenew: true,
    riskScore: 72,
    opportunityLow: 6200,
    opportunityHigh: 9800,
    status: "at_risk",
    linkedDocument: "Slack Enterprise Agreement 2025.pdf",
    isSample: true,
  },
  {
    id: "c-aws",
    vendorName: "AWS",
    category: "Cloud Infrastructure",
    annualSpend: 142000,
    renewalDate: daysFromNow(174),
    cancellationDeadline: daysFromNow(96),
    autoRenew: true,
    riskScore: 54,
    opportunityLow: 16800,
    opportunityHigh: 31200,
    status: "active",
    linkedDocument: "AWS Enterprise Agreement.pdf",
    isSample: true,
  },
  {
    id: "c-salesforce",
    vendorName: "Salesforce",
    category: "CRM",
    annualSpend: 84000,
    renewalDate: daysFromNow(66),
    cancellationDeadline: daysFromNow(31),
    autoRenew: true,
    riskScore: 81,
    opportunityLow: 11500,
    opportunityHigh: 21000,
    status: "expiring_soon",
    linkedDocument: "Salesforce Master Subscription Agreement.pdf",
    isSample: true,
  },
  {
    id: "c-zoom",
    vendorName: "Zoom",
    category: "Communications",
    annualSpend: 9600,
    renewalDate: daysFromNow(210),
    cancellationDeadline: daysFromNow(175),
    autoRenew: false,
    riskScore: 22,
    opportunityLow: 1400,
    opportunityHigh: 2600,
    status: "active",
    linkedDocument: "Zoom Business Services Agreement.pdf",
    isSample: true,
  },
  {
    id: "c-docusign",
    vendorName: "DocuSign",
    category: "Productivity",
    annualSpend: 14400,
    renewalDate: daysFromNow(23),
    cancellationDeadline: daysFromNow(-6),
    autoRenew: true,
    riskScore: 88,
    opportunityLow: 2900,
    opportunityHigh: 5200,
    status: "at_risk",
    linkedDocument: "DocuSign Subscription Agreement 2024.pdf",
    isSample: true,
  },
  {
    id: "c-snowflake",
    vendorName: "Snowflake",
    category: "Data & Analytics",
    annualSpend: 61000,
    renewalDate: daysFromNow(312),
    cancellationDeadline: daysFromNow(240),
    autoRenew: true,
    riskScore: 47,
    opportunityLow: 7400,
    opportunityHigh: 13800,
    status: "active",
    linkedDocument: "Snowflake Customer Agreement.pdf",
    isSample: true,
  },
];

export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const money = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export const formatDate = (iso: string): string =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
