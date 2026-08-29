"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { BUSINESS_PRICE, useDisplayMode } from "@/lib/displayMode";
import { getContracts, getGmailConnection } from "@/lib/store";
import { money } from "@/lib/format";
import { DetailRow } from "@/components/ui/Inspector";
import { TableFooter } from "@/components/dashboard/table";
import {
  Building,
  Check,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Plug,
  Radar,
  Settings2,
  Shield,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Settings - a proper settings workspace (left nav + panels).        */
/*  Each panel reflects only real information. Unconnected integrations */
/*  state that they are not connected; nothing is fabricated.           */
/* ------------------------------------------------------------------ */

const NAV = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workspace", label: "Workspace", icon: Building },
  { id: "members", label: "Members", icon: Users },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "ai", label: "AI", icon: Radar },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: KeyRound },
] as const;

type SectionId = (typeof NAV)[number]["id"];

interface AiStatus {
  provider: string | null;
  model: string | null;
}

export default function SettingsPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const gmail = useMemo(() => (userId ? getGmailConnection(userId) : null), [userId]);

  const [section, setSection] = useState<SectionId>("general");
  const [ai, setAi] = useState<AiStatus>({ provider: null, model: null });
  const { mode, plan, requestUpgrade, switchToFree } = useDisplayMode();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAi({ provider: d?.provider ?? null, model: d?.model ?? null }))
      .catch(() => setAi({ provider: null, model: null }));
  }, []);

  const totalSpend = contracts.reduce((a, c) => a + c.annualSpend, 0);
  const categories = [...new Set(contracts.map((c) => c.category))];
  const autoRenew = contracts.filter((c) => c.autoRenew).length;
  const escalating = contracts.filter((c) => c.escalationRate != null).length;

  const connectedCount = gmail ? 1 : 0;

  return (
    <div className="flex h-full">
      {/* ---- settings nav ---- */}
      <aside className="flex w-[224px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex h-12 shrink-0 items-center border-b border-line px-4">
          <span className="text-[13px] font-medium text-fg">Settings</span>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`sidebar-item ${active ? "sidebar-item-active" : ""}`}
              >
                <Icon size={14} className="shrink-0 text-current opacity-70" />
                <span className="min-w-0 flex-1 text-left truncate">{item.label}</span>
                {active && <span className="sidebar-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-line p-3 text-[10.5px] leading-relaxed text-zinc-600">
          Configure your workspace, data sources, and AI provider.
        </div>
      </aside>

      {/* ---- content ---- */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] flex-1 px-6 py-5">
          {section === "general" && (
            <Section title="General" sub="Account information used across your workspace.">
              <DetailRow label="Name">{auth.name || "—"}</DetailRow>
              <DetailRow label="Email">{auth.email || "—"}</DetailRow>
              <DetailRow label="Signed in">Workspace session active</DetailRow>
            </Section>
          )}

          {section === "dashboard" && (
            <Section
              title="Plan"
              sub="How you use Noma. Business is part of the paid plan - Simple is free."
            >
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "simple" as const,
                      title: "Simple",
                      price: "Free",
                      desc: "The essentials - contracts, renewals, risks, savings, and AI, easy to scan.",
                    },
                    {
                      id: "business" as const,
                      title: "Business",
                      price: BUSINESS_PRICE,
                      desc: "The full workspace - dense tables, sorting, filters, schema view, and the complete activity log.",
                    },
                  ]
                ).map((opt) => {
                  const active = opt.id === "business" ? plan === "business" : plan === "free";
                  const onChoose = () => {
                    if (opt.id === "business") requestUpgrade();
                    else switchToFree();
                  };
                  return (
                    <button
                      key={opt.id}
                      onClick={onChoose}
                      aria-pressed={active}
                      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                        active
                          ? "border-line-strong bg-white/[0.06]"
                          : "border-line bg-canvas hover:border-line-strong hover:bg-hover"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
                          {opt.title}
                          {active && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-fg text-black">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium tracking-tight text-zinc-400">
                          {opt.price}
                        </span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-muted">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {plan === "free" && (
                <p className="px-4 pb-4 text-[11.5px] leading-relaxed text-muted">
                  You&apos;re on the free plan. Business unlocks the full operational
                  workspace for {BUSINESS_PRICE} - subscribing via PayPal activates it
                  for this workspace.
                </p>
              )}
              <p className="px-4 pb-4 text-[11px] leading-relaxed text-zinc-600">
                The active mode is {mode ?? "simple"} - Business accounts always open in Business mode.
              </p>
            </Section>
          )}

          {section === "workspace" && (
            <Section
              title="Workspace"
              sub="Coverage derived from your real analyzed contracts."
            >
              <SubLabel>Coverage</SubLabel>
              <DetailRow label="Contracts analyzed" align="right">{contracts.length}</DetailRow>
              <DetailRow label="Categories" align="right">{categories.length}</DetailRow>
              <DetailRow label="Auto-renew contracts" align="right">{autoRenew}</DetailRow>
              <DetailRow label="Price escalations" align="right">{escalating}</DetailRow>
              <DetailRow label="Stated annual value" align="right">{money(totalSpend)}</DetailRow>
              {contracts.length === 0 && (
                <p className="px-4 py-4 text-[12.5px] leading-relaxed text-muted">
                  Upload a contract to analyze its terms and grow this workspace.
                </p>
              )}
            </Section>
          )}

          {section === "members" && (
            <Section title="Members" sub="People with access to this workspace.">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-semibold text-fg">
                    {(auth.name || "U").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-fg">{auth.name || "You"}</p>
                    <p className="truncate text-[11px] text-muted">{auth.email || "Owner"}</p>
                  </div>
                  <span className="chip chip-neutral">Owner</span>
                </div>
                <p className="px-4 py-3 text-[11.5px] leading-relaxed text-muted">
                  Member management is handled by your authentication provider.
                </p>
              </div>
            </Section>
          )}

          {section === "integrations" && (
            <Section
              title="Integrations"
              sub="Connected data sources. Only real connections are shown - nothing is assumed."
            >
              <Row
                title="Gmail"
                desc={
                  gmail
                    ? `Connected ${new Date(gmail.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Not connected. Vendor correspondence will not be read until it is connected."
                }
                state={gmail ? "connected" : "not connected"}
              />
              <Row
                title="Bank / billing"
                desc="Not connected. No historical spend is surfaced anywhere in the app until a billing source is connected."
                state="not connected"
              />
              <Row
                title="Data sources"
                desc={`${connectedCount} connected`}
                state={connectedCount > 0 ? "connected" : "not connected"}
              />
            </Section>
          )}

          {section === "ai" && (
            <Section
              title="AI"
              sub="The configured inference provider for contract analysis. Keys stay server-side."
            >
              <DetailRow label="Provider">
                {ai.provider ? (
                  <span className="chip chip-neutral">{ai.provider}</span>
                ) : (
                  <span className="text-muted/70">configured</span>
                )}
              </DetailRow>
              <DetailRow label="Model">
                {ai.model ? ai.model : <span className="text-muted/70">provider default</span>}
              </DetailRow>
              <div className="px-4 py-3">
                <p className="text-[11.5px] leading-relaxed text-muted">
                  The provider abstraction keeps this workspace provider-neutral. Your API key is
                  never exposed to the browser and never shown here.
                </p>
              </div>
            </Section>
          )}

          {section === "security" && (
            <Section title="Security" sub="Workspace security posture.">
              <DetailRow label="Authentication">Provider-managed sessions</DetailRow>
              <DetailRow label="Email actions">Require explicit approval</DetailRow>
              <DetailRow label="Cancellation">Never automatic</DetailRow>
              <DetailRow label="API keys">Server-only</DetailRow>
            </Section>
          )}

          {section === "billing" && (
            <Section title="Billing" sub="Plan and usage.">
              <DetailRow label="Plan">
                {plan === "business" ? `Business · ${BUSINESS_PRICE}` : "Simple · Free"}
              </DetailRow>
              <DetailRow label="Status">
                {plan === "business" ? "Active" : "Free plan"}
              </DetailRow>
              <DetailRow label="Payment method">
                {plan === "business" ? "PayPal subscription" : "Not connected"}
              </DetailRow>
              <DetailRow label="Invoices">No invoices on file</DetailRow>
              <div className="px-4 py-3">
                <p className="text-[11.5px] leading-relaxed text-muted">
                  {plan === "business"
                    ? `Business is active for this workspace (${BUSINESS_PRICE}). Your PayPal subscription keeps it unlocked, and once enabled it stays active indefinitely - it is never revoked automatically.`
                    : "You're on the free Simple plan. Upgrade to Business for the full operational workspace."}
                </p>
              </div>
            </Section>
          )}

          {section === "notifications" && (
            <Section title="Notifications" sub="Alert preferences for renewal and risk events.">
              <ToggleRow title="Renewal reminders" desc="Close to cancellation windows" />
              <ToggleRow title="Risk alerts" desc="Elevated risk scores" />
              <ToggleRow title="Action approval" desc="Pending recommended actions" />
              <p className="px-4 py-3 text-[11.5px] leading-relaxed text-muted">
                Notifications appear in the Activity log; delivery is configurable once a channel is connected.
              </p>
            </Section>
          )}
        </div>

        <TableFooter
          left={<span>Settings</span>}
          right={<span className="text-zinc-600">your workspace</span>}
        />
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="panel-surface flex flex-col overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[13.5px] font-semibold tracking-tight text-fg">{title}</h2>
        {sub && <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/60">
      {children}
    </p>
  );
}

function Row({
  title,
  desc,
  state,
}: {
  title: string;
  desc: string;
  state: "connected" | "not connected";
}) {
  return (
    <div className="flex items-start gap-3 border-b border-line/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{desc}</p>
      </div>
      <span className="shrink-0">
        {state === "connected" ? (
          <span className="chip chip-neutral">Connected</span>
        ) : (
          <span className="chip chip-neutral">Not connected</span>
        )}
      </span>
    </div>
  );
}

function ToggleRow({ title, desc }: { title: string; desc: string }) {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[11.5px] text-muted">{desc}</p>
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={`flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
          on ? "justify-end border-white/20 bg-white/25" : "justify-start border-line bg-white/[0.04]"
        }`}
      >
        <span className={`mx-0.5 size-3.5 rounded-full transition-colors ${on ? "bg-black" : "bg-zinc-500"}`} />
      </button>
    </div>
  );
}