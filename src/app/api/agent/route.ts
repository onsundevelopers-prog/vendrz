import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { AGENT_TOOLS, executeTool } from "@/lib/ai/agentTools";
import { advisorReply, type AdvisorDraft } from "@/lib/agentQuery";
import type { ActivityRecord, ContractRecord, EmailThread } from "@/lib/types";
import { money } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 120;

/* ------------------------------------------------------------------ */
/*  POST /api/agent                                                    */
/*  NomaAI with real tool-calling.                                     */
/*                                                                     */
/*  Flow:                                                              */
/*  1. Build system prompt + user question                             */
/*  2. Call AI provider with tool definitions                          */
/*  3. Model selects tools → execute backend functions                 */
/*  4. Feed results back to model → model reasons → responds           */
/*  5. Fall back to deterministic engine if provider fails             */
/*                                                                     */
/*  The agent NEVER claims an action occurred unless the tool          */
/*  returned success. No emails are sent. No cancellations executed.  */
/* ------------------------------------------------------------------ */

interface AgentRequest {
  question: string;
  contracts?: ContractRecord[];
  threads?: EmailThread[];
  activity?: ActivityRecord[];
  senderName?: string;
}

const AGENT_SYSTEM = `You are Noma's assistant, a procurement analyst.

You have access to the user's real vendor contracts, email threads, and activity data.
You MUST use the available tools to answer questions. Do NOT make up data.

RULES:
1. ALWAYS call a tool before answering. Never guess or invent data.
2. Use search_contracts to find vendors. Use get_contract for details.
3. Use get_upcoming_renewals and get_cancellation_deadlines for time-sensitive items.
4. Use get_vendor_risk for risk analysis. Use get_savings_opportunities for savings.
5. Use search_email_threads to read vendor correspondence.
6. Use draft_email to prepare communications (NEVER send them - only draft).
7. Use get_portfolio_summary for high-level questions.
8. If you cannot find data, say so honestly.
9. Mark claims as FACT (directly from data), ESTIMATE (calculated), or RECOMMENDATION (suggested action).
10. Be concise and decisive. Every answer should help the user act.

You can call multiple tools in sequence to build a complete answer.
For example: search_contracts("Microsoft") → get_contract(vendor_name="Microsoft") → search_email_threads(vendor_name="Microsoft") → draft_email(vendor_name="Microsoft", purpose="negotiation")`;

export async function POST(req: NextRequest) {
  let body: AgentRequest;
  try {
    body = (await req.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const contracts = body.contracts ?? [];
  const threads = body.threads ?? [];
  const activity = body.activity ?? [];
  const senderName = body.senderName ?? "Your team";

  // Build the data context for tool execution
  const toolData = {
    contracts: contracts.map((c) => ({ ...c })),
    threads: threads.map((t) => ({ ...t })),
    activity: activity.map((a) => ({ ...a })),
  };

  // Build portfolio summary for context
  const total = contracts.reduce((s, c) => s + c.annualSpend, 0);
  const atRisk = contracts.filter((c) => c.riskScore >= 60).length;
  const renewing90 = contracts.filter((c) => {
    if (!c.renewalDate) return false;
    const d = Math.ceil((new Date(c.renewalDate + "T00:00:00").getTime() - Date.now()) / 86400000);
    return d >= 0 && d <= 90;
  }).length;

  const contextHint = [
    `PORTFOLIO: ${contracts.length} contracts, ${money(total)}/yr total value, ${atRisk} at risk, ${renewing90} renewing within 90 days.`,
    threads.length > 0 ? `${threads.length} email threads stored.` : "No vendor correspondence stored.",
    activity.length > 0 ? `${activity.length} activity events.` : "",
  ].filter(Boolean).join(" ");

  try {
    const provider = getAIProvider();

    // Use the tool-calling loop
    const { content, calls } = await provider.runToolLoop(
      {
        system: AGENT_SYSTEM,
        prompt: `${contextHint}\n\nUser: ${question}\n\nUse the available tools to find and return the answer.`,
        tools: AGENT_TOOLS,
        maxRounds: 5,
      },
      async (toolCall) => {
        // Execute the tool against real data
        return executeTool(toolCall, toolData);
      }
    );

    // Resolve contract evidence by matching vendor names
    const mentioned = contracts.filter((c) =>
      c.vendorName ? content.toLowerCase().includes(c.vendorName.toLowerCase()) : false
    );
    const contractIds = mentioned.map((c) => c.id);

    // If the agent drafted an email, create an approval action
    let draft: ReturnType<typeof draftToResp> | undefined;
    const draftTool = calls.find((c) => c.name === "draft_email");
    if (draftTool) {
      const vendorName = String(draftTool.arguments.vendor_name ?? "");
      const purpose = String(draftTool.arguments.purpose ?? "follow_up");
      const vendor = contracts.find((c) =>
        c.vendorName?.toLowerCase().includes(vendorName.toLowerCase())
      );
      if (vendor) {
        // Real sender from stored correspondence only - never an invented address.
        const sender =
          threads.find(
            (t) =>
              t.vendorName?.toLowerCase() ===
              vendor.vendorName?.toLowerCase()
          )?.sender ?? "";
        draft = {
          action_type: purpose as AdvisorDraft["action_type"],
          vendorId: vendor.id,
          vendorName: vendor.vendorName,
          reasoning: `Agent drafted a ${purpose} email for ${vendor.vendorName} based on portfolio data.`,
          proposed_changes: `Send ${purpose} email to ${vendor.vendorName}${sender ? ` (${sender})` : " - no sender address on file yet"}`,
          to: sender,
          subject: `${purpose.charAt(0).toUpperCase() + purpose.slice(1)} - ${vendor.vendorName}`,
          body: content.slice(0, 2000),
        };
      }
    }

    return NextResponse.json({
      text: content,
      contractIds,
      draft,
      provider: provider.id,
      model: provider.model,
      toolsUsed: calls.map((c) => c.name),
    });
  } catch (err) {
    console.error("[agent] AI provider failed:", err);
    // Honest fallback: deterministic engine
    try {
      const fallback = advisorReply(question, contracts, {
        threads,
        activity,
        senderName,
      });
      return NextResponse.json({
        text: fallback.text,
        contractIds: fallback.contractIds,
        draft: fallback.draft ? draftToResp(fallback.draft) : undefined,
        provider: "fallback-rule-engine",
        model: "deterministic",
        toolsUsed: [],
      });
    } catch {
      return NextResponse.json(
        { error: "The AI provider is unavailable right now. Check OLLAMA_API_KEY / AI_PROVIDER." },
        { status: 502 }
      );
    }
  }
}

/** Map a deterministic AdvisorDraft to the client's expected draft shape. */
function draftToResp(d: AdvisorDraft) {
  return {
    action_type: d.action_type,
    vendorId: d.vendorId,
    vendorName: d.vendorName,
    to: d.to,
    subject: d.subject,
    body: d.body,
    reasoning: d.reasoning,
    proposed_changes: d.proposed_changes,
  };
}
