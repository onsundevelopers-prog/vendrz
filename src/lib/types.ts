/* ------------------------------------------------------------------ */
/*  Vendrz - domain types                                   */
/*  Mirrors the PRD data model: User, Organization, Vendor, Contract,  */
/*  Finding, Opportunity, SavingsOutcome, AnonymousSession,            */
/*  GmailConnection, DiscoveredDocument.                               */
/* ------------------------------------------------------------------ */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type FindingType =
  | "renewal"
  | "cancellation"
  | "auto_renewal"
  | "price_escalation"
  | "opportunity"
  | "risk";

export type Severity = "info" | "warning" | "critical";

export interface Evidence {
  excerpt: string;
  section: string;
  page: number;
}

export interface Finding {
  id: string;
  contractId: string;
  type: FindingType;
  severity: Severity;
  title: string;
  detail: string;
  confidence: number; // 0–1
  evidence: Evidence;
  created_at: string;
}

export type OpportunityStatus = "open" | "negotiating" | "resolved" | "dismissed";

export interface Opportunity {
  id: string;
  contractId: string;
  type: string;
  estimatedLow: number; // USD / yr
  estimatedHigh: number; // USD / yr
  confidence: number; // 0–1
  status: OpportunityStatus;
  basis: string; // one-line "how we calculated this"
  drivers: string[]; // deterministic rule drivers
}

export interface SavingsOutcome {
  id: string;
  opportunityId: string;
  estimatedAmount: number;
  verifiedAmount: number | null;
  status: "pending" | "verified" | "missed";
  verifiedAt: string | null;
}

export interface PriceEscalation {
  rate: number | null; // annual % if found
  trigger: string; // e.g. "CPI-linked, capped at 5%"
}

export interface AnalysisResult {
  id: string;
  documentName: string;
  vendorName: string;
  category: string;
  analyzedAt: string;
  riskScore: number; // 0–100
  riskLabel: string;
  renewalDate: string | null;
  cancellationDeadline: string | null;
  autoRenew: boolean | null;
  autoRenewNoticeDays: number | null;
  priceEscalation: PriceEscalation | null;
  annualValue: number | null;
  savings: { low: number; high: number };
  findings: Finding[];
  opportunities: Opportunity[];
  method: string[]; // "how we calculated this" bullets
}

/* ------------------------- pipeline ------------------------- */

export type PipelineStage =
  | "queued"
  | "extraction"
  | "classification"
  | "segmentation"
  | "llm_extraction"
  | "validation"
  | "risk_rules"
  | "savings"
  | "results";

export interface PipelineStageMeta {
  id: PipelineStage;
  label: string;
  description: string;
}

/* ------------------------- persistence ------------------------- */

/** Structured terms extracted from a contract document by the LLM. */
export interface ContractExtraction {
  vendorName: string;
  parties: string[];
  contractType: string | null;
  /** ISO YYYY-MM-DD when stated */
  effectiveDate: string | null;
  /** Next renewal or end date as ISO YYYY-MM-DD when determinable */
  renewalDate: string | null;
  autoRenews: boolean | null;
  /** Days of advance notice required to cancel, when stated */
  autoRenewalNoticeDays: number | null;
  terminationNoticeDays: number | null;
  /** Annual price escalation percentage, e.g. 4.5 */
  priceEscalationRate: number | null;
  /** Annualized fee in USD, when stated */
  annualSpend: number | null;
  paymentTerms: string | null;
  /** Short quotes of the most important clauses */
  keyClauses: string[];
  /** Auto-renew traps, long lock-ins, unilateral price changes, missing cancel terms */
  riskFlags: string[];
  missingInformation: string[];
  summary: string;
}

export interface AnonymousSession {
  id: string;
  documentName: string;
  fileKind: "pdf" | "docx" | "unknown";
  fileSize: number;
  createdAt: string;
  expiresAt: string; // 14 days
  pipelineStatus: PipelineStage | "complete" | "failed";
  result: AnalysisResult | null;
  /** Real LLM extraction when the document was analyzed through /api/extract. */
  extraction: ContractExtraction | null;
  transferredToUserId: string | null;
  source: "manual" | "gmail";
}

export interface Account {
  id: string;
  email: string;
  name: string;
  provider: "google" | "email";
  createdAt: string;
}

export interface GmailConnection {
  id: string;
  userId: string;
  connectedAt: string;
  disconnectedAt: string | null;
  scopeGranted: string[];
  status: "connected" | "disconnected";
}

export interface DiscoveredDocument {
  id: string;
  gmailConnectionId: string;
  filename: string;
  emailSubject: string;
  sender: string;
  emailDate: string;
  detectedVendor: string;
  documentType: string;
  confidence: number; // 0–1
  imported: boolean;
  appearsToBeContract: boolean;
}

/* ------------------------- dashboard ------------------------- */

export interface ContractRecord {
  id: string;
  vendorName: string;
  category: string;
  annualSpend: number;
  renewalDate: string;
  cancellationDeadline: string | null;
  autoRenew: boolean;
  riskScore: number;
  opportunityLow: number;
  opportunityHigh: number;
  status: "active" | "expiring_soon" | "at_risk" | "resolved";
  linkedDocument: string;
  isSample: boolean;
}

export interface DashboardStats {
  contractsMonitored: number;
  upcomingRenewals: number; // within 90 days
  potentialOpportunities: number;
  highRiskContracts: number; // risk >= 60
  totalOpportunityLow: number;
  totalOpportunityHigh: number;
}

/* ================================================================== */
/*  Vendor Spend Intelligence Platform - domain                       */
/* ================================================================== */

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type SpendCategory =
  | "Software"
  | "Cloud"
  | "Marketing"
  | "Operations"
  | "Finance"
  | "HR"
  | "Infrastructure"
  | "Other";

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number;
  currency: string;
  description: string;
  merchant: string;
  vendorId: string;
  category: SpendCategory;
  account: string;
  recurring: boolean;
  source: string; // e.g. "plaid", "brex", "expensify", "upload"
  confidence: number; // vendor-match confidence 0–1
}

export type ContractStatus = "active" | "expiring_soon" | "at_risk";

export interface BillingAnomaly {
  id: string;
  vendorId: string;
  type:
    | "overbilling"
    | "unexpected_increase"
    | "duplicate_charge"
    | "missing_discount"
    | "incorrect_seat_count"
    | "price_increase";
  detail: string;
  impact: number; // annualized $ impact
  variancePct: number;
}

export interface InvoiceRecord {
  id: string;
  vendorId: string;
  number: string;
  date: string;
  amount: number;
  contractedAmount: number;
  status: "paid" | "pending" | "disputed";
  lineItems: string[];
  anomalyId?: string;
}

export interface RenewalRisk {
  level: AlertSeverity;
  daysToRenewal: number;
  daysToDeadline: number;
  noticePeriodDays: number;
  expectedIncreasePct: number;
  potentialRenewalCost: number; // annualized cost at renewal
  autoRenew: boolean;
}

export interface UsageSnapshot {
  seatsPurchased: number;
  activeUsers: number;
  inactiveUsers: number;
  utilizationPct: number;
  costPerActiveUser: number; // $/mo
  unusedSeatCost: number; // annualized $
}

export interface VendorProfile {
  id: string;
  name: string;
  category: SpendCategory;
  description: string;
  annualSpend: number;
  monthlyAvg: number;
  spendTrendPct: number; // vs previous year
  monthlySeries: number[]; // 12 months, most recent last
  contractStatus: ContractStatus;
  contractValue: number;
  startDate: string;
  renewalDate: string | null;
  cancellationDeadline: string | null;
  autoRenew: boolean;
  priceEscalationRate: number | null;
  /** Accountable owner (human) - from the procurement roster. */
  owner: string;
  /** ISO date of the most recent contract review. */
  lastReviewed: string;
  seats: number;
  activeUsers: number;
  unusedSeats: number;
  utilizationPct: number;
  costPerActiveUser: number;
  potentialSavings: number;
  healthScore: number; // 0–100
  usage: UsageSnapshot | null;
  billing: {
    expectedMonthly: number;
    actualMonthly: number;
    variancePct: number;
    anomalies: BillingAnomaly[];
  };
  invoices: InvoiceRecord[];
  duplicates: string[]; // overlapping vendor names (tools)
  risk: RenewalRisk | null;
  isCurated: boolean;
}

export type OpportunityType =
  | "unused_seats"
  | "duplicate_tools"
  | "contract_optimization"
  | "price_increase"
  | "cancellation"
  | "billing_discrepancy"
  | "usage_optimization"
  | "license_reduction";

export type ActionStatus =
  | "open"
  | "in_review"
  | "actioned"
  | "dismissed"
  | "savings_confirmed";

export interface SavingsOpportunity {
  id: string;
  vendorId: string;
  vendorName: string;
  category: SpendCategory;
  type: OpportunityType;
  title: string;
  what: string; // WHAT WE FOUND
  why: string; // WHY IT MATTERS
  estimatedSavings: number; // $/yr - always labeled potential
  recommendedAction: string;
  status: ActionStatus;
  confidence: number; // 0–1
  basis: string; // how calculated
  createdAt: string;
}

export type AlertType =
  | "renewal"
  | "price_increase"
  | "unused_seats"
  | "billing"
  | "duplicate_tools"
  | "spend_growth";

export interface AlertRecord {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  vendorId?: string;
  vendorName?: string;
  type: AlertType;
  amount?: number;
  createdAt: string;
  read: boolean;
}

export interface SpendPoint {
  month: string; // "2025-09"
  label: string;
  total: number;
  categories: Partial<Record<SpendCategory, number>>;
}

export interface SavingsTracking {
  potential: number;
  actioned: number;
  confirmed: number;
}

export interface DataSource {
  id: string;
  name: string;
  kind: "financial" | "invoice" | "contract" | "vendor" | "expense";
  status: "connected" | "demo" | "available";
  readOnly: boolean;
  description: string;
  connectedAt?: string;
}

export interface CompanyAudit {
  companyName: string;
  generatedAt: string;
  totalAnnualSpend: number;
  monthlySpend: number;
  potentialSavings: number;
  vendorCount: number;
  transactionCount: number;
  renewalRisks: number;
  unusedLicenses: number;
  billingAnomalies: number;
  priceIncreases: number;
  healthScore: number; // overall vendor spend health 0–100
  spendSeries: SpendPoint[];
  categories: { name: SpendCategory; spend: number; count: number }[];
  vendors: VendorProfile[];
  opportunities: SavingsOpportunity[];
  alerts: AlertRecord[];
  savings: SavingsTracking;
  dataSources: DataSource[];
}

/* ------------------------- audit pipeline ------------------------- */

export type AuditStage =
  | "connect"
  | "collect"
  | "normalize"
  | "match"
  | "analyze"
  | "opportunities"
  | "recommend"
  | "results";

export interface AuditStageMeta {
  id: AuditStage;
  label: string;
  description: string;
}

export interface AuditSession {
  id: string;
  source: "gmail" | "aws" | "manual";
  createdAt: string;
  pipelineStatus: AuditStage | "complete" | "failed";
  companyName: string;
  /** Set for manual uploads - the source document name. */
  documentName?: string | null;
  /** Set for manual uploads - structured extraction from the uploaded file. */
  extraction?: ContractExtraction | null;
  result: CompanyAudit | null;
  unlockedToUserId: string | null;
}

/* ------------------------- activity + agent ------------------------- */

export type ActivityActor = "agent" | "user" | "system";

export type ActivityType =
  | "alert"
  | "import"
  | "review"
  | "email_sent"
  | "email_drafted"
  | "cancellation"
  | "status_change"
  | "savings";

export interface ActivityRecord {
  id: string;
  vendorId?: string;
  vendorName?: string;
  type: ActivityType;
  actor: ActivityActor;
  title: string;
  detail: string;
  createdAt: string; // ISO
}

export interface AgentMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
  /** Present when the agent needs explicit approval to send. */
  pendingApproval?: {
    action: "send_email" | "cancel_contract";
    vendorId: string;
    vendorName: string;
    to: string;
    subject: string;
    body: string;
  };
}

export interface EmailThread {
  id: string;
  vendorId: string;
  vendorName: string;
  subject: string;
  snippet: string;
  sender: string;
  date: string; // ISO
  unread: boolean;
  category: "renewal" | "invoice" | "negotiation" | "general";
}
