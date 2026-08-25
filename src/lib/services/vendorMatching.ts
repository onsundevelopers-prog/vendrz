/* ------------------------------------------------------------------ */
/*  Vendor identity & matching layer.                                 */
/*  Raw merchant strings ("ANTHROPIC*CLAUDE", "CURSOR AI") are        */
/*  normalized and matched to canonical vendor ids with a confidence. */
/* ------------------------------------------------------------------ */

export interface MerchantMatch {
  vendorId: string;
  vendorName: string;
  confidence: number; // 0–1
  normalized: string;
}

/**
 * Alias map: normalized merchant token → canonical vendor id.
 * The normalization pipeline: uppercase → strip punctuation → drop
 * generic suffixes (*CLAUDE, AI, INC, LLC, .COM, etc.) → match.
 */
const MERCHANT_ALIASES: Record<string, string> = {
  // Anthropic — the spec's canonical example
  "ANTHROPIC*CLAUDE": "v-anthropic",
  "ANTHROPIC PBC": "v-anthropic",
  "ANTHROPIC": "v-anthropic",
  "CLAUDE.AI": "v-anthropic",
  "CLAUDE": "v-anthropic",
  // Cursor
  "CURSOR AI": "v-cursor",
  "CURSOR.COM": "v-cursor",
  "ANYSHP CURSOR": "v-cursor",
  "CURSOR": "v-cursor",
  "CURSOR*": "v-cursor",
  // AWS
  "AMAZON WEB SERVICES": "v-aws",
  "AWS": "v-aws",
  "AWS*": "v-aws",
  "AMAZON": "v-aws",
  // Slack
  "SLACK": "v-slack",
  "SLACK TECHNOLOGIES": "v-slack",
  "SLACK*": "v-slack",
  // Adobe
  "ADOBE": "v-adobe",
  "ADOBE SYSTEMS": "v-adobe",
  "ADOBE*": "v-adobe",
  "ADOBE CREATIVE CLOUD": "v-adobe",
  // Google
  "GOOGLE WORKSPACE": "v-google-workspace",
  "GOOGLE": "v-google-workspace",
  "GSUITE": "v-google-workspace",
  "GOOGLE CLOUD": "v-google-workspace",
  // Notion
  "NOTION": "v-notion",
  "NOTION LABS": "v-notion",
  "NOTION.AI": "v-notion",
  // HubSpot
  "HUBSPOT": "v-hubspot",
  "HUBSPOT INC": "v-hubspot",
  "HUBSPOT*": "v-hubspot",
  // Figma
  "FIGMA": "v-figma",
  "FIGMA INC": "v-figma",
  // GitHub
  "GITHUB": "v-github",
  "GITHUB INC": "v-github",
  "GITHUB.COM": "v-github",
  // Salesforce
  "SALESFORCE": "v-salesforce",
  "SALESFORCE.COM": "v-salesforce",
  "SALESFORCE*": "v-salesforce",
  // Microsoft
  "MICROSOFT": "v-microsoft-365",
  "MICROSOFT 365": "v-microsoft-365",
  "MICROSOFT*": "v-microsoft-365",
  "M365": "v-microsoft-365",
  // Datadog
  "DATADOG": "v-datadog",
  "DATADOG INC": "v-datadog",
  // Snowflake
  "SNOWFLAKE": "v-snowflake",
  "SNOWFLAKE COMPUTING": "v-snowflake",
  // Zoom
  "ZOOM": "v-zoom",
  "ZOOM.US": "v-zoom",
  "ZOOM VIDEO": "v-zoom",
  // DocuSign
  "DOCUSIGN": "v-docusign",
  "DOCUSIGN INC": "v-docusign",
  // Atlassian
  "ATLASSIAN": "v-atlassian",
  "JIRA": "v-atlassian",
  "JIRA SOFTWARE": "v-atlassian",
  "CONFLUENCE": "v-confluence",
  // OpenAI
  "OPENAI": "v-openai",
  "OPENAI.COM": "v-openai",
  "CHATGPT": "v-openai",
  // Linear
  "LINEAR": "v-linear",
  "LINEAR APP": "v-linear",
  "LINEARAPP": "v-linear",
  // Vercel
  "VERCEL": "v-vercel",
  "VERCEL INC": "v-vercel",
  // Stripe
  "STRIPE": "v-stripe",
  "STRIPE INC": "v-stripe",
  // Twilio
  "TWILIO": "v-twilio",
  "TWILIO INC": "v-twilio",
  // Cloudflare
  "CLOUDFLARE": "v-cloudflare",
  "CLOUDFLARE INC": "v-cloudflare",
  // Sentry
  "SENTRY": "v-sentry",
  "SENTRY.IO": "v-sentry",
  // PostHog
  "POSTHOG": "v-posthog",
  "POSTHOG INC": "v-posthog",
  // Intercom
  "INTERCOM": "v-intercom",
  "INTERCOM INC": "v-intercom",
  // Zendesk
  "ZENDESK": "v-zendesk",
  "ZENDESK INC": "v-zendesk",
  // Asana
  "ASANA": "v-asana",
  "ASANA INC": "v-asana",
  // Miro
  "MIRO": "v-miro",
  "MIRO.COM": "v-miro",
  "REALTIMEBOARD": "v-miro",
  // Loom
  "LOOM": "v-loom",
  "LOOM.COM": "v-loom",
  // Canva
  "CANVA": "v-canva",
  "CANVA PTY": "v-canva",
  // Dropbox
  "DROPBOX": "v-dropbox",
  "DROPBOX INC": "v-dropbox",
  // Okta
  "OKTA": "v-okta",
  "OKTA INC": "v-okta",
  // 1Password
  "1PASSWORD": "v-1password",
  "1PASSWORD.COM": "v-1password",
  // Discord
  "DISCORD": "v-discord",
  "DISCORD INC": "v-discord",
  // Amplitude
  "AMPLITUDE": "v-amplitude",
  "AMPLITUDE INC": "v-amplitude",
  // Segment
  "SEGMENT": "v-segment",
  "SEGMENT.IO": "v-segment",
  "TWILIO SEGMENT": "v-segment",
  // Zapier
  "ZAPIER": "v-zapier",
  "ZAPIER INC": "v-zapier",
  // Webflow
  "WEBFLOW": "v-webflow",
  "WEBFLOW INC": "v-webflow",
  // Airtable
  "AIRTABLE": "v-airtable",
  "AIRTABLE INC": "v-airtable",
  // PagerDuty
  "PAGERDUTY": "v-pagerduty",
  "PAGER DUTY": "v-pagerduty",
  // New Relic
  "NEW RELIC": "v-new-relic",
  "NEWRELIC": "v-new-relic",
  // MongoDB
  "MONGODB": "v-mongodb",
  "MONGODB ATLAS": "v-mongodb",
  "MONGODB INC": "v-mongodb",
  // Supabase
  "SUPABASE": "v-supabase",
  "SUPABASE INC": "v-supabase",
  // Fastly
  "FASTLY": "v-fastly",
  "FASTLY INC": "v-fastly",
  // Grammarly
  "GRAMMARLY": "v-grammarly",
  "GRAMMARLY INC": "v-grammarly",
  // Vimeo
  "VIMEO": "v-vimeo",
  // Typeform
  "TYPEFORM": "v-typeform",
  // Calendly
  "CALENDLY": "v-calendly",
  // Lattice
  "LATTICE": "v-lattice",
  // Rippling
  "RIPPLING": "v-rippling",
  // Gusto
  "GUSTO": "v-gusto",
  // Expensify
  "EXPENSIFY": "v-expensify",
  // QuickBooks
  "QUICKBOOKS": "v-quickbooks",
  "INTUIT": "v-quickbooks",
  // Airbase
  "AIRBASE": "v-airbase",
  // Brex
  "BREX": "v-brex",
  "BREX INC": "v-brex",
  // Ramp
  "RAMP": "v-ramp",
  // SendGrid
  "SENDGRID": "v-sendgrid",
  // Klaviyo
  "KLAVIYO": "v-klaviyo",
  // Braze
  "BRAZE": "v-braze",
  // Aircall
  "AIRCALL": "v-aircall",
  // RingCentral
  "RINGCENTRAL": "v-ringcentral",
  // Greenhouse
  "GREENHOUSE": "v-greenhouse",
  // Deel
  "DEEL": "v-deel",
  // PandaDoc
  "PANDADOC": "v-pandadoc",
  // Ironclad
  "IRONCLAD": "v-ironclad",
  // Productboard
  "PRODUCTBOARD": "v-productboard",
  // Hotjar
  "HOTJAR": "v-hotjar",
  // FullStory
  "FULLSTORY": "v-fullstory",
  // Heap
  "HEAP": "v-heap",
  // Coda
  "CODA": "v-coda",
  // Guru
  "GURU": "v-guru",
  // Freshdesk
  "FRESHDESK": "v-freshdesk",
  // Front
  "FRONT": "v-front",
  "FRONTAPP": "v-front",
  // Toggl
  "TOGGL": "v-toggl",
  // Harvest
  "HARVEST": "v-harvest",
  // Chargebee
  "CHARGEBEE": "v-chargebee",
  // NetSuite
  "NETSUITE": "v-netsuite",
  "ORACLE NETSUITE": "v-netsuite",
  // Coupa
  "COUPA": "v-coupa",
  // Workday
  "WORKDAY": "v-workday",
};

/** Generic suffix tokens stripped before alias lookup. */
const NOISE_TOKENS = [
  "AI", "INC", "LLC", "LTD", "CORP", "CORPORATION", "COM", "CO", "TECHNOLOGIES",
  "TECHNOLOGY", "SOFTWARE", "SERVICES", "SYSTEMS", "PBC", "LABS", "GMBH",
  "INTERNATIONAL", "HOLDINGS", "GROUP", "THE",
];

export function normalizeMerchant(raw: string): string {
  let s = raw.toUpperCase().trim();
  s = s.replace(/[*.]/g, " ");
  s = s.replace(/\s+/g, " ");
  // strip generic noise tokens (e.g. "ANTHROPIC PBC" → "ANTHROPIC")
  const parts = s.split(" ").filter((p) => !NOISE_TOKENS.includes(p));
  return parts.join(" ");
}

export function matchMerchant(raw: string): MerchantMatch | null {
  const normalized = normalizeMerchant(raw);
  const direct = MERCHANT_ALIASES[normalized];
  if (direct) {
    return { vendorId: direct, vendorName: direct, confidence: 0.99, normalized };
  }
  // substring match on the leading token cluster
  const first = normalized.split(" ")[0];
  if (first && MERCHANT_ALIASES[first]) {
    return {
      vendorId: MERCHANT_ALIASES[first],
      vendorName: MERCHANT_ALIASES[first],
      confidence: 0.9,
      normalized,
    };
  }
  return null;
}

/** Deterministic canonical id for an unmatched merchant. */
export function unknownVendorId(normalized: string): string {
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `v-x-${(h >>> 0).toString(36)}`;
}
