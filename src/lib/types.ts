/* ------------------------------------------------------------------ */
/*  Noma - domain types                                      */
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
  /** Latest date to give notice and avoid auto-renewal (derived by the AI). */
  cancellationDeadline: string | null;
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

/* ------------------------------------------------------------------ */
/*  Rich contract extraction - the canonical AI output schema.         */
/*                                                                     */
/*  The AI provider returns this richer, more precise shape. It is     */
/*  stored alongside the analysis and mapped down into                 */
/*  ContractExtraction / AnalysisResult for the existing pipeline, so  */
/*  downstream consumers keep working untouched.                       */
/* ------------------------------------------------------------------ */

export interface ContractObligation {
  /** Short description of the obligation. */
  term: string;
  /** Contract section or clause reference when available. */
  section: string | null;
}

export interface ContractRisk {
  /** What is wrong / the risk described. */
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  /** Clause excerpt backing the finding, when available. */
  evidence: string | null;
}

export interface ContractSavingsOpportunity {
  /** e.g. "Price escalation cap". */
  type: string;
  /** Annualized estimated low bound (USD) when determinable. */
  estimate_low: number | null;
  /** Annualized estimated high bound (USD) when determinable. */
  estimate_high: number | null;
  /** One-line explanation of how the estimate was derived. */
  basis: string | null;
  /** Whether this is a confirmed/calculated figure vs a negotiation target. */
  confirmed: boolean;
}

/** Canonical, fully-detailed AI contract extraction. */
export interface RichContractExtraction {
  vendor_name: string;
  customer_name: string;
  /** ISO YYYY-MM-DD. */
  contract_start_date: string | null;
  /** ISO YYYY-MM-DD. */
  contract_end_date: string | null;
  auto_renewal: boolean | null;
  /** Term length in months when auto-renewing, if stated. */
  renewal_term_months: number | null;
  /** Days of advance notice required to cancel, if stated. */
  notice_period_days: number | null;
  /** ISO YYYY-MM-DD derived from end/renewal minus notice period, when determinable. */
  cancellation_deadline: string | null;
  /** Contract value, in `currency`, when stated. */
  contract_value: number | null;
  currency: string | null;
  /** e.g. "annual" | "monthly" | "quarterly" when stated. */
  billing_frequency: string | null;
  price_escalation: boolean | null;
  /** Annual escalation percentage, e.g. 4.5; only when price_escalation is true. */
  price_escalation_percentage: number | null;
  termination_terms: string | null;
  payment_terms: string | null;
  obligations: ContractObligation[];
  risks: ContractRisk[];
  savings_opportunities: ContractSavingsOpportunity[];
  /** 0-1 confidence in the overall extraction. */
  confidence_score: number | null;
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
  /** Canonical rich extraction (the AI's full output), stored alongside. */
  richExtraction: RichContractExtraction | null;
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
  /** Annual price escalation % when extracted from the document. */
  escalationRate: number | null;
  riskScore: number;
  opportunityLow: number;
  opportunityHigh: number;
  status: ContractStatus;
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
  autoRenewals: number; // contracts with auto-renewal on
  priceEscalations: number; // contracts with an escalation rate
  cancellationOpportunities: number; // contracts inside the cancel window with auto-renew
}

/* ================================================================== */
/*  Noma - domain types                                              */
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
  /** Contract records referenced as evidence - clickable in the agent panel. */
  evidenceIds?: string[];
  /** Present when the agent needs explicit approval to act. */
  pendingApproval?: {
    /** Links to a persisted ApprovalAction (pending until approved). */
    action_id: string;
    action_type: ApprovalActionType;
    vendorId: string;
    vendorName: string;
    reasoning: string;
    proposed_changes: string;
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

/* ------------------------- action approval ------------------------- */

/** Actions the AI may recommend. Only the user may approve execution. */
export type ApprovalActionType =
  | "cancellation"
  | "negotiation"
  | "renewal"
  | "follow_up";

export type ApprovalActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

/**
 * A human-gated action recommended by the AI.
 *
 * The AI always creates an action in `pending`. Destructive or externally
 * visible actions (cancellation, sending an email) ONLY progress past
 * `pending` with explicit user approval - they are never executed
 * automatically. Irreversible actions require explicit authorization.
 */
export interface ApprovalAction {
  /** Stable action identifier. */
  action_id: string;
  /** What the AI is recommending. */
  action_type: ApprovalActionType;
  /** The subject of the action (e.g. vendor / contract name + id). */
  target: string;
  /** Why the AI recommended this - the FACT/ESTIMATE basis. */
  reasoning: string;
  /** Exactly what executing the action would do (changes to apply/send). */
  proposed_changes: string;
  /** Lifecycle - see ApprovalActionStatus. */
  status: ApprovalActionStatus;
  /** Optional vendor/contract reference. */
  vendorId?: string;
  created_at: string; // ISO
  approved_at: string | null; // ISO - set only on user approval
  executed_at: string | null; // ISO - set only after execution begins/completes
}
