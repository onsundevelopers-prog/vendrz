import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { richToExtraction } from "@/lib/ai/base";
import { runExtractionPipeline } from "@/lib/ai/extractPipeline";
import { createJob, setJobStage, completeJob, failJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * POST /api/extract
 * Accepts a multipart file, creates an extraction job, and processes
 * it in the background. Returns { jobId, status } immediately so the
 * frontend can poll /api/extract/status/[jobId] for progress.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File is larger than 25 MB." }, { status: 413 });
    }

    const name = file.name.toLowerCase();

    // Validate file type early
    if (!name.endsWith(".pdf") && !name.endsWith(".txt") && !name.endsWith(".md") && !name.endsWith(".csv") && !name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, TXT, or Markdown." },
        { status: 400 }
      );
    }

    // Create job and return immediately
    const job = createJob("anonymous", file.name);
    setJobStage(job.id, "queued", 100);

    // Process in background (non-blocking)
    processExtraction(job.id, file, name).catch((err) => {
      console.error(`[extract] Job ${job.id} failed:`, err);
    });

    return NextResponse.json({
      jobId: job.id,
      status: "queued",
      message: "Extraction started. Poll /api/extract/status/{jobId} for progress.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
}

/**
 * Background extraction processor.
 * Extracts text, runs the staged pipeline, and persists results.
 */
async function processExtraction(jobId: string, file: File, name: string) {
  const startTime = Date.now();

  try {
    // Stage 1: Upload
    setJobStage(jobId, "uploading", 50);

    // Stage 2: Text extraction
    setJobStage(jobId, "extracting_text", 0);
    let text: string;
    const textStart = Date.now();

    if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
      try {
        const result = await parser.getText();
        text = result.text ?? "";
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await mammoth.extractRawText({ buffer: buf });
      text = parsed.value;
    } else {
      text = await file.text();
    }

    const textMs = Date.now() - textStart;
    setJobStage(jobId, "extracting_text", 100);

    if (text.trim().length < 40) {
      failJob(jobId, "This file looks empty - no readable text found.");
      return;
    }

    // Stage 3: Preprocessing
    setJobStage(jobId, "preprocessing", 50);

    // Stage 4: Staged LLM extraction (parallel chunked calls)
    setJobStage(jobId, "analyzing", 0);

    const provider = getAIProvider();
    const pipelineResult = await runExtractionPipeline(
      provider,
      text,
      file.name,
      (stage, progress) => {
        setJobStage(jobId, "analyzing", progress);
      }
    );

    setJobStage(jobId, "validating", 50);

    // Stage 5: Map to legacy extraction + result
    const extraction = richToExtraction(pipelineResult.extraction);
    const analysis = {
      id: `r-${file.name.replace(/\.[^.]+$/, "").toLowerCase()}`,
      documentName: file.name,
      vendorName: pipelineResult.extraction.vendor_name || "Unidentified Vendor",
      category: "Uncategorized",
      analyzedAt: new Date().toISOString(),
      riskScore: 0,
      riskLabel: "Pending",
      renewalDate: pipelineResult.extraction.contract_end_date,
      cancellationDeadline: pipelineResult.extraction.cancellation_deadline,
      autoRenew: pipelineResult.extraction.auto_renewal,
      autoRenewNoticeDays: pipelineResult.extraction.notice_period_days,
      priceEscalation: pipelineResult.extraction.price_escalation
        ? { rate: pipelineResult.extraction.price_escalation_percentage, trigger: "Annual increase" }
        : null,
      annualValue: pipelineResult.extraction.contract_value,
      savings: {
        low: pipelineResult.extraction.savings_opportunities.reduce((s, o) => s + (o.estimate_low ?? 0), 0),
        high: pipelineResult.extraction.savings_opportunities.reduce((s, o) => s + (o.estimate_high ?? 0), 0),
      },
      findings: [],
      opportunities: [],
      method: ["Staged extraction with parallel LLM calls", `Text extracted in ${textMs}ms`, `Total pipeline: ${Date.now() - startTime}ms`],
    };

    setJobStage(jobId, "persisting", 80);

    // Complete the job
    completeJob(jobId, {
      extraction,
      analysis,
      documentName: file.name,
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
