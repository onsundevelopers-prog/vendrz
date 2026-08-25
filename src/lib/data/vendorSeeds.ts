import type { BillingAnomaly, ContractStatus, SpendCategory } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Vendor seeds — the deterministic input for every engine.          */
/*  Flagship vendors (AWS, Adobe, Slack, Cursor) carry the spec's     */
/*  worked examples so the demo behaves exactly like the product doc. */
/* ------------------------------------------------------------------ */

export interface SeedAnomaly {
  type: BillingAnomaly["type"];
  detail: string;
  variancePct: number; // % vs expected monthly
}

export interface VendorSeed {
  id: string;
  name: string;
  category: SpendCategory;
  description: string;
  annualSpend: number; // current trailing-12-month total
  spendTrendPct: number; // vs previous 12 months
  seats: number; // 0 = usage-based / infrastructure (no seats)
  activeUsers: number;
  renewalInDays?: number; // undefined = rolling / no contract term
  cancellationInDays?: number;
  autoRenew: boolean;
  escalationRate: number | null; // annual %
  expectedMonthly?: number; // contract-expected; defaults to annualSpend/12
  anomalies: SeedAnomaly[];
  duplicateGroup?: string;
  status: ContractStatus;
}

export const CURATED_VENDORS: VendorSeed[] = [
  {
    id: "v-aws", name: "AWS", category: "Cloud", description: "Compute, storage, and cloud infrastructure",
    annualSpend: 30480, spendTrendPct: 27, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    expectedMonthly: 2000, anomalies: [{ type: "unexpected_increase", detail: "Monthly spend is 27% above the contracted baseline with no new workloads added.", variancePct: 27 }],
    status: "active",
  },
  {
    id: "v-adobe", name: "Adobe", category: "Cloud", description: "Creative Cloud suite for design and content",
    annualSpend: 42000, spendTrendPct: 15, seats: 60, activeUsers: 48, renewalInDays: 37, cancellationInDays: 7, autoRenew: true, escalationRate: 12,
    anomalies: [
      { type: "price_increase", detail: "Annual price increase of 15% effective this quarter.", variancePct: 15 },
      { type: "overbilling", detail: "Invoice exceeds contracted seat count by 12 seats.", variancePct: 8 },
    ],
    status: "at_risk",
  },
  {
    id: "v-slack", name: "Slack", category: "Software", description: "Team messaging and collaboration",
    annualSpend: 31800, spendTrendPct: 14, seats: 250, activeUsers: 217, renewalInDays: 41, cancellationInDays: 12, autoRenew: true, escalationRate: 5,
    anomalies: [{ type: "unexpected_increase", detail: "Monthly billing increased 14% despite flat headcount.", variancePct: 14 }],
    duplicateGroup: "communication", status: "at_risk",
  },
  {
    id: "v-cursor", name: "Cursor", category: "Software", description: "AI code editor for the engineering team",
    annualSpend: 24000, spendTrendPct: 12, seats: 50, activeUsers: 41, renewalInDays: 204, cancellationInDays: 174, autoRenew: true, escalationRate: 5,
    anomalies: [], status: "active",
  },
  {
    id: "v-anthropic", name: "Anthropic", category: "Software", description: "Claude AI usage across product and engineering",
    annualSpend: 15600, spendTrendPct: 38, seats: 30, activeUsers: 28, renewalInDays: 141, cancellationInDays: 111, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-google-workspace", name: "Google Workspace", category: "Software", description: "Email, docs, and productivity suite",
    annualSpend: 20700, spendTrendPct: 6, seats: 180, activeUsers: 162, renewalInDays: 218, cancellationInDays: 188, autoRenew: true, escalationRate: 3,
    anomalies: [], status: "active",
  },
  {
    id: "v-notion", name: "Notion", category: "Software", description: "Docs, wikis, and project workspace",
    annualSpend: 13000, spendTrendPct: 9, seats: 120, activeUsers: 104, renewalInDays: 88, cancellationInDays: 58, autoRenew: true, escalationRate: 5,
    anomalies: [{ type: "overbilling", detail: "Charged for 120 seats; only 104 are active on the workspace.", variancePct: 6 }],
    duplicateGroup: "documentation", status: "expiring_soon",
  },
  {
    id: "v-hubspot", name: "HubSpot", category: "Marketing", description: "CRM and marketing automation",
    annualSpend: 12100, spendTrendPct: 12, seats: 80, activeUsers: 61, renewalInDays: 78, cancellationInDays: 48, autoRenew: true, escalationRate: 7,
    anomalies: [{ type: "price_increase", detail: "Marketing Hub tier price increased 12% at renewal.", variancePct: 12 }],
    status: "expiring_soon",
  },
  {
    id: "v-figma", name: "Figma", category: "Software", description: "Design and prototyping collaboration",
    annualSpend: 8600, spendTrendPct: 8, seats: 90, activeUsers: 77, renewalInDays: 55, cancellationInDays: 25, autoRenew: true, escalationRate: 5,
    anomalies: [], status: "expiring_soon",
  },
  {
    id: "v-github", name: "GitHub", category: "Software", description: "Source hosting and CI minutes",
    annualSpend: 10400, spendTrendPct: 5, seats: 100, activeUsers: 88, renewalInDays: 300, cancellationInDays: 270, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-salesforce", name: "Salesforce", category: "Software", description: "Sales CRM platform",
    annualSpend: 17300, spendTrendPct: 10, seats: 75, activeUsers: 52, renewalInDays: 66, cancellationInDays: 31, autoRenew: true, escalationRate: 5,
    anomalies: [{ type: "missing_discount", detail: "Enterprise agreement discount not applied to last two invoices.", variancePct: -4 }],
    status: "expiring_soon",
  },
  {
    id: "v-microsoft-365", name: "Microsoft 365", category: "Software", description: "Office productivity and email",
    annualSpend: 13800, spendTrendPct: 4, seats: 160, activeUsers: 151, renewalInDays: 260, cancellationInDays: 230, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "communication", status: "active",
  },
  {
    id: "v-datadog", name: "Datadog", category: "Cloud", description: "Infrastructure monitoring and observability",
    annualSpend: 11200, spendTrendPct: 18, seats: 0, activeUsers: 0, renewalInDays: 95, cancellationInDays: 65, autoRenew: true, escalationRate: null,
    anomalies: [
      { type: "unexpected_increase", detail: "Host count billing grew 18% with no new environments.", variancePct: 18 },
      { type: "overbilling", detail: "Duplicate host tags double-billed 9% of usage.", variancePct: 9 },
    ],
    status: "active",
  },
  {
    id: "v-snowflake", name: "Snowflake", category: "Cloud", description: "Cloud data warehouse",
    annualSpend: 6900, spendTrendPct: 7, seats: 0, activeUsers: 0, renewalInDays: 312, cancellationInDays: 240, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-zoom", name: "Zoom", category: "Software", description: "Video conferencing",
    annualSpend: 6900, spendTrendPct: 3, seats: 60, activeUsers: 44, renewalInDays: 210, cancellationInDays: 175, autoRenew: false, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-docusign", name: "DocuSign", category: "Software", description: "E-signature and agreement workflows",
    annualSpend: 10400, spendTrendPct: 6, seats: 40, activeUsers: 35, renewalInDays: 23, cancellationInDays: -6, autoRenew: true, escalationRate: 3,
    anomalies: [{ type: "duplicate_charge", detail: "Two identical monthly invoices were charged back-to-back.", variancePct: 3 }],
    status: "at_risk",
  },
  {
    id: "v-atlassian", name: "Atlassian", category: "Software", description: "Jira and dev collaboration suite",
    annualSpend: 8600, spendTrendPct: 9, seats: 70, activeUsers: 58, renewalInDays: 120, cancellationInDays: 90, autoRenew: true, escalationRate: 5,
    anomalies: [], status: "active",
  },
  {
    id: "v-openai", name: "OpenAI", category: "Software", description: "GPT API and ChatGPT Team seats",
    annualSpend: 10400, spendTrendPct: 42, seats: 25, activeUsers: 25, renewalInDays: 150, cancellationInDays: 120, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-linear", name: "Linear", category: "Software", description: "Issue tracking for product teams",
    annualSpend: 4300, spendTrendPct: 11, seats: 40, activeUsers: 35, renewalInDays: 230, cancellationInDays: 200, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-vercel", name: "Vercel", category: "Cloud", description: "Frontend hosting and serverless functions",
    annualSpend: 5200, spendTrendPct: 16, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-stripe", name: "Stripe", category: "Finance", description: "Payment processing fees",
    annualSpend: 2600, spendTrendPct: 8, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-twilio", name: "Twilio", category: "Cloud", description: "SMS and communications API",
    annualSpend: 6000, spendTrendPct: 13, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [{ type: "duplicate_charge", detail: "Overlapping API credits billed on two accounts.", variancePct: 4 }],
    status: "active",
  },
  {
    id: "v-cloudflare", name: "Cloudflare", category: "Infrastructure", description: "CDN and edge security",
    annualSpend: 4300, spendTrendPct: 6, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-sentry", name: "Sentry", category: "Software", description: "Error monitoring and tracing",
    annualSpend: 3900, spendTrendPct: 10, seats: 25, activeUsers: 19, renewalInDays: 160, cancellationInDays: 130, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-posthog", name: "PostHog", category: "Software", description: "Product analytics",
    annualSpend: 3500, spendTrendPct: 21, seats: 30, activeUsers: 24, renewalInDays: 190, cancellationInDays: 160, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "analytics", status: "active",
  },
  {
    id: "v-intercom", name: "Intercom", category: "Marketing", description: "Customer messaging and support",
    annualSpend: 6900, spendTrendPct: 7, seats: 20, activeUsers: 14, renewalInDays: 85, cancellationInDays: 55, autoRenew: true, escalationRate: 5,
    anomalies: [], status: "expiring_soon",
  },
  {
    id: "v-zendesk", name: "Zendesk", category: "Operations", description: "Customer support helpdesk",
    annualSpend: 8600, spendTrendPct: 4, seats: 40, activeUsers: 31, renewalInDays: 240, cancellationInDays: 210, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-asana", name: "Asana", category: "Software", description: "Work management",
    annualSpend: 5200, spendTrendPct: 6, seats: 55, activeUsers: 42, renewalInDays: 200, cancellationInDays: 170, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "project-mgmt", status: "active",
  },
  {
    id: "v-miro", name: "Miro", category: "Software", description: "Whiteboarding and collaboration",
    annualSpend: 4300, spendTrendPct: 9, seats: 70, activeUsers: 51, renewalInDays: 175, cancellationInDays: 145, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-loom", name: "Loom", category: "Software", description: "Async video messaging",
    annualSpend: 3000, spendTrendPct: 5, seats: 45, activeUsers: 33, renewalInDays: 82, cancellationInDays: 52, autoRenew: true, escalationRate: null,
    anomalies: [], status: "expiring_soon",
  },
  {
    id: "v-canva", name: "Canva", category: "Software", description: "Design tool for marketing assets",
    annualSpend: 4300, spendTrendPct: 8, seats: 60, activeUsers: 49, renewalInDays: 250, cancellationInDays: 220, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-dropbox", name: "Dropbox", category: "Software", description: "File sync and sharing",
    annualSpend: 5200, spendTrendPct: 2, seats: 80, activeUsers: 62, renewalInDays: 280, cancellationInDays: 250, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-okta", name: "Okta", category: "Infrastructure", description: "Identity and SSO",
    annualSpend: 6900, spendTrendPct: 5, seats: 120, activeUsers: 95, renewalInDays: 190, cancellationInDays: 160, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-1password", name: "1Password", category: "Infrastructure", description: "Password management",
    annualSpend: 2600, spendTrendPct: 4, seats: 90, activeUsers: 82, renewalInDays: 300, cancellationInDays: 270, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-confluence", name: "Confluence", category: "Software", description: "Internal wikis and documentation",
    annualSpend: 7800, spendTrendPct: 3, seats: 110, activeUsers: 74, renewalInDays: 130, cancellationInDays: 100, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "documentation", status: "active",
  },
  {
    id: "v-discord", name: "Discord", category: "Software", description: "Community and voice chat",
    annualSpend: 3500, spendTrendPct: 7, seats: 60, activeUsers: 22, renewalInDays: 100, cancellationInDays: 70, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "communication", status: "active",
  },
  {
    id: "v-amplitude", name: "Amplitude", category: "Software", description: "Product and behavior analytics",
    annualSpend: 6000, spendTrendPct: 11, seats: 0, activeUsers: 0, renewalInDays: 170, cancellationInDays: 140, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "analytics", status: "active",
  },
  {
    id: "v-segment", name: "Segment", category: "Cloud", description: "Customer data pipeline",
    annualSpend: 5200, spendTrendPct: 9, seats: 0, activeUsers: 0, renewalInDays: 220, cancellationInDays: 190, autoRenew: true, escalationRate: null,
    anomalies: [], duplicateGroup: "analytics", status: "active",
  },
  {
    id: "v-zapier", name: "Zapier", category: "Software", description: "Workflow automation",
    annualSpend: 3900, spendTrendPct: 10, seats: 35, activeUsers: 22, renewalInDays: 75, cancellationInDays: 45, autoRenew: true, escalationRate: null,
    anomalies: [], status: "expiring_soon",
  },
  {
    id: "v-webflow", name: "Webflow", category: "Marketing", description: "Website builder and CMS",
    annualSpend: 3000, spendTrendPct: 4, seats: 12, activeUsers: 9, renewalInDays: 180, cancellationInDays: 150, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-airtable", name: "Airtable", category: "Software", description: "Low-code database and forms",
    annualSpend: 4300, spendTrendPct: 7, seats: 40, activeUsers: 28, renewalInDays: 96, cancellationInDays: 66, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-pagerduty", name: "PagerDuty", category: "Operations", description: "Incident response and on-call",
    annualSpend: 5600, spendTrendPct: 5, seats: 30, activeUsers: 24, renewalInDays: 210, cancellationInDays: 180, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-new-relic", name: "New Relic", category: "Cloud", description: "Application performance monitoring",
    annualSpend: 6000, spendTrendPct: 8, seats: 20, activeUsers: 12, renewalInDays: 64, cancellationInDays: 34, autoRenew: true, escalationRate: null,
    anomalies: [], status: "expiring_soon",
  },
  {
    id: "v-mongodb", name: "MongoDB Atlas", category: "Cloud", description: "Managed document database",
    annualSpend: 4800, spendTrendPct: 14, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-supabase", name: "Supabase", category: "Cloud", description: "Backend-as-a-service",
    annualSpend: 3000, spendTrendPct: 19, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-fastly", name: "Fastly", category: "Infrastructure", description: "Edge compute and CDN",
    annualSpend: 3900, spendTrendPct: 3, seats: 0, activeUsers: 0, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
  {
    id: "v-grammarly", name: "Grammarly", category: "Software", description: "Writing assistance",
    annualSpend: 3500, spendTrendPct: 8, seats: 120, activeUsers: 87, renewalInDays: 230, cancellationInDays: 200, autoRenew: true, escalationRate: null,
    anomalies: [], status: "active",
  },
];

/* ------------------------------------------------------------------ */
/*  Long-tail filler vendors — deterministic generation from a pool.  */
/* ------------------------------------------------------------------ */

export interface FillerEntry {
  name: string;
  category: SpendCategory;
  typical: number; // typical annual spend
}

export const FILLER_POOL: FillerEntry[] = [
  { name: "Vimeo", category: "Marketing", typical: 1200 },
  { name: "Typeform", category: "Marketing", typical: 1800 },
  { name: "Hotjar", category: "Marketing", typical: 900 },
  { name: "FullStory", category: "Software", typical: 2400 },
  { name: "Heap", category: "Software", typical: 1500 },
  { name: "Mixpanel", category: "Software", typical: 2100 },
  { name: "ChartMogul", category: "Finance", typical: 800 },
  { name: "Baremetrics", category: "Finance", typical: 600 },
  { name: "Chargebee", category: "Finance", typical: 1400 },
  { name: "Recurly", category: "Finance", typical: 1100 },
  { name: "Mercury", category: "Finance", typical: 0 },
  { name: "Ramp", category: "Finance", typical: 0 },
  { name: "Brex", category: "Finance", typical: 0 },
  { name: "Gusto", category: "HR", typical: 2400 },
  { name: "Rippling", category: "HR", typical: 3600 },
  { name: "Deel", category: "HR", typical: 2800 },
  { name: "Remote", category: "HR", typical: 2200 },
  { name: "Oyster", category: "HR", typical: 1600 },
  { name: "Greenhouse", category: "HR", typical: 4800 },
  { name: "Lever", category: "HR", typical: 3200 },
  { name: "Workable", category: "HR", typical: 1900 },
  { name: "BambooHR", category: "HR", typical: 2600 },
  { name: "Lattice", category: "HR", typical: 2100 },
  { name: "15Five", category: "HR", typical: 1300 },
  { name: "CultureAmp", category: "HR", typical: 1700 },
  { name: "HiBob", category: "HR", typical: 2900 },
  { name: "Personio", category: "HR", typical: 2400 },
  { name: "Justworks", category: "HR", typical: 2000 },
  { name: "TriNet", category: "HR", typical: 3100 },
  { name: "Paychex", category: "HR", typical: 1500 },
  { name: "QuickBooks", category: "Finance", typical: 1200 },
  { name: "Xero", category: "Finance", typical: 700 },
  { name: "NetSuite", category: "Finance", typical: 6800 },
  { name: "Expensify", category: "Finance", typical: 1300 },
  { name: "Concur", category: "Operations", typical: 2200 },
  { name: "Navan", category: "Finance", typical: 1800 },
  { name: "Airbase", category: "Finance", typical: 2100 },
  { name: "Bill.com", category: "Finance", typical: 1400 },
  { name: "AvidXchange", category: "Finance", typical: 1600 },
  { name: "Coupa", category: "Finance", typical: 5200 },
  { name: "Zip", category: "Finance", typical: 2600 },
  { name: "Precoro", category: "Finance", typical: 900 },
  { name: "Procurify", category: "Finance", typical: 1100 },
  { name: "Ironclad", category: "Operations", typical: 3400 },
  { name: "Icertis", category: "Operations", typical: 2900 },
  { name: "PandaDoc", category: "Operations", typical: 1300 },
  { name: "HelloSign", category: "Operations", typical: 800 },
  { name: "Nitro", category: "Software", typical: 700 },
  { name: "Foxit", category: "Software", typical: 600 },
  { name: "Toggl", category: "Operations", typical: 500 },
  { name: "Clockify", category: "Operations", typical: 400 },
  { name: "Harvest", category: "Operations", typical: 900 },
  { name: "Timecamp", category: "Operations", typical: 600 },
  { name: "Calendly", category: "Marketing", typical: 1100 },
  { name: "Chili Piper", category: "Marketing", typical: 1700 },
  { name: "Cal.com", category: "Marketing", typical: 500 },
  { name: "Aircall", category: "Operations", typical: 1900 },
  { name: "RingCentral", category: "Operations", typical: 2300 },
  { name: "Vonage", category: "Operations", typical: 1400 },
  { name: "SendGrid", category: "Marketing", typical: 1200 },
  { name: "Mailgun", category: "Marketing", typical: 700 },
  { name: "Postmark", category: "Marketing", typical: 600 },
  { name: "Resend", category: "Marketing", typical: 500 },
  { name: "Customer.io", category: "Marketing", typical: 1500 },
  { name: "Klaviyo", category: "Marketing", typical: 1800 },
  { name: "ActiveCampaign", category: "Marketing", typical: 1600 },
  { name: "ConvertKit", category: "Marketing", typical: 800 },
  { name: "Drip", category: "Marketing", typical: 700 },
  { name: "Braze", category: "Marketing", typical: 4200 },
  { name: "Leanplum", category: "Marketing", typical: 2000 },
  { name: "MoEngage", category: "Marketing", typical: 1300 },
  { name: "CleverTap", category: "Marketing", typical: 1700 },
  { name: "AppsFlyer", category: "Marketing", typical: 1500 },
  { name: "Adjust", category: "Marketing", typical: 1200 },
  { name: "Branch", category: "Marketing", typical: 1400 },
  { name: "Productboard", category: "Software", typical: 2400 },
  { name: "Aha!", category: "Software", typical: 2100 },
  { name: "Monday.com", category: "Software", typical: 2800 },
  { name: "Wrike", category: "Software", typical: 1700 },
  { name: "Teamwork", category: "Software", typical: 900 },
  { name: "Basecamp", category: "Software", typical: 800 },
  { name: "Height", category: "Software", typical: 600 },
  { name: "Coda", category: "Software", typical: 1100 },
  { name: "Slite", category: "Software", typical: 500 },
  { name: "Tettra", category: "Operations", typical: 400 },
  { name: "Guru", category: "Operations", typical: 700 },
  { name: "Document360", category: "Operations", typical: 800 },
  { name: "Helpjuice", category: "Operations", typical: 500 },
  { name: "Freshdesk", category: "Operations", typical: 1000 },
  { name: "Help Scout", category: "Operations", typical: 900 },
  { name: "Groove", category: "Operations", typical: 600 },
  { name: "Kustomer", category: "Operations", typical: 1600 },
  { name: "Front", category: "Operations", typical: 2200 },
  { name: "Missive", category: "Operations", typical: 700 },
  { name: "Hiver", category: "Operations", typical: 600 },
  { name: "Workday", category: "HR", typical: 7600 },
  { name: "ADP", category: "HR", typical: 3400 },
  { name: "Namely", category: "HR", typical: 1200 },
  { name: "Sage", category: "Finance", typical: 1400 },
  { name: "Oracle", category: "Infrastructure", typical: 5600 },
  { name: "IBM", category: "Infrastructure", typical: 4800 },
  { name: "Cisco", category: "Infrastructure", typical: 3900 },
  { name: "Palo Alto Networks", category: "Infrastructure", typical: 4400 },
  { name: "CrowdStrike", category: "Infrastructure", typical: 3600 },
  { name: "Zscaler", category: "Infrastructure", typical: 2800 },
  { name: "Netskope", category: "Infrastructure", typical: 2000 },
  { name: "Jamf", category: "Infrastructure", typical: 1500 },
  { name: "JumpCloud", category: "Infrastructure", typical: 1300 },
  { name: "Tailscale", category: "Infrastructure", typical: 700 },
  { name: "WireGuard", category: "Infrastructure", typical: 0 },
  { name: "CircleCI", category: "Cloud", typical: 2600 },
  { name: "GitLab", category: "Cloud", typical: 3100 },
  { name: "Buildkite", category: "Cloud", typical: 1700 },
  { name: "Bitrise", category: "Cloud", typical: 1200 },
  { name: "Netlify", category: "Cloud", typical: 1300 },
  { name: "Railway", category: "Cloud", typical: 900 },
  { name: "Render", category: "Cloud", typical: 800 },
  { name: "Fly.io", category: "Cloud", typical: 1000 },
  { name: "Hetzner", category: "Cloud", typical: 1100 },
  { name: "DigitalOcean", category: "Cloud", typical: 1400 },
  { name: "Linode", category: "Cloud", typical: 1000 },
  { name: "Grafana Cloud", category: "Cloud", typical: 2200 },
  { name: "Prometheus", category: "Cloud", typical: 0 },
  { name: "Logz.io", category: "Cloud", typical: 1600 },
  { name: "Splunk", category: "Cloud", typical: 4200 },
  { name: "Sumo Logic", category: "Cloud", typical: 2400 },
  { name: "Elastic", category: "Cloud", typical: 2800 },
  { name: "ChaosSearch", category: "Cloud", typical: 1300 },
  { name: "HashiCorp", category: "Infrastructure", typical: 2300 },
  { name: "Terraform Cloud", category: "Infrastructure", typical: 1200 },
  { name: "Vault", category: "Infrastructure", typical: 0 },
  { name: "Doppler", category: "Infrastructure", typical: 600 },
  { name: "ngrok", category: "Infrastructure", typical: 500 },
  { name: "Postman", category: "Software", typical: 1100 },
  { name: "Insomnia", category: "Software", typical: 300 },
  { name: "SwaggerHub", category: "Software", typical: 700 },
  { name: "Snyk", category: "Infrastructure", typical: 2900 },
  { name: "SonarQube", category: "Infrastructure", typical: 1800 },
  { name: "Code Climate", category: "Infrastructure", typical: 900 },
  { name: "Cypress", category: "Cloud", typical: 800 },
  { name: "Playwright", category: "Cloud", typical: 0 },
  { name: "BrowserStack", category: "Cloud", typical: 2100 },
  { name: "Sauce Labs", category: "Cloud", typical: 1900 },
  { name: "LambdaTest", category: "Cloud", typical: 1000 },
  { name: "Tauri", category: "Cloud", typical: 0 },
  { name: "Framer", category: "Marketing", typical: 900 },
  { name: "Webflow", category: "Marketing", typical: 0 },
  { name: "Squarespace", category: "Marketing", typical: 600 },
  { name: "Wix", category: "Marketing", typical: 700 },
  { name: "Unbounce", category: "Marketing", typical: 800 },
  { name: "Instapage", category: "Marketing", typical: 900 },
  { name: "Leadpages", category: "Marketing", typical: 600 },
  { name: "OptinMonster", category: "Marketing", typical: 400 },
  { name: "Crazy Egg", category: "Marketing", typical: 500 },
  { name: "Ahrefs", category: "Marketing", typical: 1800 },
  { name: "SEMrush", category: "Marketing", typical: 2400 },
  { name: "Moz", category: "Marketing", typical: 1400 },
  { name: "Screaming Frog", category: "Marketing", typical: 300 },
  { name: "Surfer", category: "Marketing", typical: 900 },
  { name: "Clearscope", category: "Marketing", typical: 1100 },
  { name: "MarketMuse", category: "Marketing", typical: 1000 },
  { name: "Writer", category: "Marketing", typical: 1300 },
  { name: "Jasper", category: "Marketing", typical: 1200 },
  { name: "Copy.ai", category: "Marketing", typical: 700 },
  { name: "Rytr", category: "Marketing", typical: 300 },
  { name: "Grammarly Business", category: "Software", typical: 0 },
];

/** Deterministic PRNG so demo data is stable across renders. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const CATEGORY_DESCRIPTIONS: Partial<Record<SpendCategory, string>> = {
  Software: "SaaS tools and licenses",
  Cloud: "Cloud infrastructure and usage-based services",
  Marketing: "Marketing, analytics, and growth tools",
  Operations: "Customer support and operations tools",
  Finance: "Financial services and payment processing",
  HR: "HR, recruiting, and people tools",
  Infrastructure: "Security, networking, and infrastructure",
  Other: "Miscellaneous services",
};
