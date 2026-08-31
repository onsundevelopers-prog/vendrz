/* ------------------------------------------------------------------ */
/*  Shared extraction finalization + interrupted-job resume.          */
/*                                                                     */
/*  finishAnalysis() runs the LLM pipeline over already-extracted      */
/*  text and completes/fails the job - used both by the live upload    */
/*  path and by resumeInterruptedJobs().                               */
/*                                                                     */
/*  After a server restart, persisted jobs that had their text         */
/*  extracted are resumed automatically (the expensive LLM phase       */
/*  re-runs); jobs that died before text extraction can't be resumed   */
/*  and are marked failed with an honest message. Triggered once per   */
/*  process lifetime from the extract routes.                          */
/* ------------------------------------------------------------------ */

import { getAIProvider } from "./ai";
import { richToExtraction } from "./ai/base";
import { runExtractionPipeline } from "./ai/extractPipeline";
import {
  completeJob,
  failJob,
  listJobs,
  setJobStage,
} from "./jobs";

/* ------------------------------------------------------------------ */
/*  PDF extraction on Node / Vercel.                                   */
/*                                                                     */
/*  pdf-parse v2 wraps pdfjs-dist, which references browser globals     */
/*  (DOMMatrix, ImageData, Path2D) at MODULE LOAD time. Node lacks     */
/*  them, and pdf-parse's canvas dependency (@napi-rs/canvas) provides */
/*  real implementations - but they must be installed on globalThis    */
/*  BEFORE pdfjs-dist is imported, otherwise parsing throws            */
/*  "DOMMatrix is not defined" and every PDF fails server-side.        */
/* ------------------------------------------------------------------ */
let pdfGlobalsInstalled = false;
async function installPdfGlobals(): Promise<void> {
  if (pdfGlobalsInstalled) return;
  pdfGlobalsInstalled = true;
  try {
    const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
    // Only fill gaps - never override if the runtime already provides them.
    if (typeof globalThis.DOMMatrix === "undefined") {
      (globalThis as unknown as { DOMMatrix: typeof DOMMatrix }).DOMMatrix = DOMMatrix;
    }
    if (typeof globalThis.ImageData === "undefined") {
      (globalThis as unknown as { ImageData: typeof ImageData }).ImageData = ImageData;
    }
    if (typeof globalThis.Path2D === "undefined") {
      (globalThis as unknown as { Path2D: typeof Path2D }).Path2D = Path2D;
    }
  } catch (err) {
    console.error("[extract] Could not load @napi-rs/canvas for PDF text extraction:", err);
  }
}

let resumeTriggered = false;
const resuming = new Set<string>();

/**
 * Build an actionable "analysis unreachable" message. When every LLM task
 * failed, the real cause (provider name and HTTP status - e.g. a Gemini
 * quota 429, an invalid model 404, or a misconfigured key) is far more
 * useful than a generic "not reachable". Falls back to the friendly generic
 * copy when nothing useful can be parsed from the task errors.
 */
export function aiUnreachableMessage(taskErrors: string[]): string {
  const causes: string[] = [];
  const seen = new Set<string>();
  for (const te of taskErrors) {
    // task errors look like: "risks: AI provider error (gemini-3.6-flash) 429: ..."
    const m = te.match(
      /AI provider error \(([^)]+)\) (\d{3}):(.*)/
    );
    if (m) {
      const [_, model, status, detail] = m;
      const key = `${model} ${status}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const statusDesc = {
        "401": "auth failed",
        "402": "payment required",
        "403": "forbidden",
        "404": "model not found",
        "429": "rate-limited / quota exhausted",
        "5xx-like": "server error",
      }[status] ?? `HTTP ${status}`;
      const terse = detail.replace(/\s+/g, " ").slice(0, 140);
      causes.push(`${model} (${statusDesc}): ${terse}`);
    }
  }
  if (causes.length > 0) {
    return (
      `The AI analysis service couldn't process this file right now - the model ` +
      `provider rejected the request: ${[...new Set(causes)].join("; ")}. ` +
      `Check your AI provider setup (Ollama / Gemini) and try again.`
    );
  }
  return (
    "The AI analysis service isn't reachable right now. Check your AI provider setup (Ollama / Gemini) and try again."
  );
}


/** Kick off resume of interrupted jobs - safe to call on every request. */
export function triggerJobResume(): void {
  if (resumeTriggered) return;
  resumeTriggered = true;
  void resumeInterruptedJobs();
}

/** Resume every non-terminal job that persisted extracted text. */
async function resumeInterruptedJobs(): Promise<void> {
  for (const job of listJobs()) {
    if (job.status === "complete" || job.status === "failed") continue;
    if (resuming.has(job.id)) continue;
    if (job.text) {
      resuming.add(job.id);
      void finishAnalysis(job.id, job.text, job.filename)
        .catch((err) => {
          console.error(`[extract-resume] Job ${job.id} failed to resume:`, err);
          failJob(job.id, "The analysis couldn't be resumed after the server restarted. Please re-upload the file.");
        })
        .finally(() => resuming.delete(job.id));
    } else {
      // Died before the document text was extracted - the original file
      // bytes are gone, so there is nothing to resume from.
      failJob(
        job.id,
        "The analysis server restarted before this file could be processed. Please re-upload the file."
      );
    }
  }
}

/**
 * Run the LLM analysis over extracted text and persist the result.
 * Shared by the live upload path and interrupted-job resume.
 */
export async function finishAnalysis(
  jobId: string,
  text: string,
  filename: string
): Promise<void> {
  const startTime = Date.now();
  const provider = getAIProvider();
  console.log(
    `[extract] analyze job=${jobId} file="${filename}" provider=${provider.id} model=${provider.model} textChars=${text.length}`
  );

  try {
    setJobStage(jobId, "preprocessing", 50);

    // Staged LLM extraction (parallel chunked calls)
    setJobStage(jobId, "analyzing", 0);
    const pipelineResult = await runExtractionPipeline(
      provider,
      text,
      filename,
      (stage, progress) => {
        setJobStage(jobId, "analyzing", progress);
      }
    );

    setJobStage(jobId, "validating", 50);

    // Distinguish a reachable-but-empty document from an unreachable model.
    // When the LLM tasks all failed, the job should fail loudly with a real
    // reason instead of silently "completing" with a hollow extraction.
    if (pipelineResult.taskErrors.length >= 3) {
      const reason = aiUnreachableMessage(pipelineResult.taskErrors);
      failJob(jobId, reason);
      console.error(
        `[extract] Job ${jobId}: LLM unreachable - ${pipelineResult.taskErrors.join("; ")}`
      );
      return;
    }

    const rich = pipelineResult.extraction;
    const hasRealTerms =
      !!rich.contract_start_date ||
      !!rich.contract_end_date ||
      !!rich.cancellation_deadline ||
      rich.auto_renewal !== null ||
      rich.contract_value !== null ||
      rich.price_escalation !== null ||
      rich.obligations.length > 0 ||
      rich.risks.length > 0 ||
      rich.savings_opportunities.length > 0;
    if (!hasRealTerms) {
      failJob(
        jobId,
        "Couldn't find any contract terms in this file. Try another file."
      );
      return;
    }

    // Map to legacy extraction + result
    const extraction = richToExtraction(rich);
    const analysis = {
      id: `r-${filename.replace(/\.[^.]+$/, "").toLowerCase()}`,
      documentName: filename,
      vendorName: rich.vendor_name || "Unidentified Vendor",
      category: "Uncategorized",
      analyzedAt: new Date().toISOString(),
      riskScore: 0,
      riskLabel: "Pending",
      renewalDate: rich.contract_end_date,
      cancellationDeadline: rich.cancellation_deadline,
      autoRenew: rich.auto_renewal,
      autoRenewNoticeDays: rich.notice_period_days,
      priceEscalation: rich.price_escalation
        ? { rate: rich.price_escalation_percentage, trigger: "Annual increase" }
        : null,
      annualValue: rich.contract_value,
      savings: {
        low: rich.savings_opportunities.reduce((s, o) => s + (o.estimate_low ?? 0), 0),
        high: rich.savings_opportunities.reduce((s, o) => s + (o.estimate_high ?? 0), 0),
      },
      findings: [],
      opportunities: [],
      method: ["Staged extraction with parallel LLM calls", `Total pipeline: ${Date.now() - startTime}ms`],
    };

    setJobStage(jobId, "persisting", 80);

    // Complete the job
    completeJob(jobId, {
      extraction,
      analysis,
      documentName: filename,
    });

    console.log(
      `[extract] Job ${jobId} complete in ${Date.now() - startTime}ms ` +
        `(${pipelineResult.timings.llmCalls} LLM calls, ~${pipelineResult.timings.tokensEstimate} tokens)`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    failJob(jobId, message);
    console.error(`[extract] Job ${jobId} failed after ${Date.now() - startTime}ms:`, message);
  }
}

/** Extract raw text from an uploaded file (PDF / DOCX / text). */
export async function extractFileText(file: File, name: string): Promise<string> {
  if (name.endsWith(".pdf")) {
    // pdfjs-dist needs DOMMatrix/ImageData/Path2D on globalThis at load - install
    // them from @napi-rs/canvas before importing pdf-parse. (Tracking the awaited
    // promise keeps the dynamic import from racing the global assignment.)
    await installPdfGlobals();
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    try {
      const result = await parser.getText();
      return result.text ?? "";
    } finally {
      await parser.destroy();
    }
  } else if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await mammoth.extractRawText({ buffer: buf });
    return parsed.value;
  }
  return file.text();
}
