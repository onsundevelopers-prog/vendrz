import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { createJob, failJob, getJob, saveJobText, setJobStage } from "@/lib/jobs";
import { extractFileText, finishAnalysis, triggerJobResume } from "@/lib/extractResume";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * POST /api/extract
 * Accepts a multipart file, runs the full extraction pipeline, and
 * returns the finished result in the response.
 *
 * On serverless platforms (Vercel) the function's execution context is
 * torn down as soon as a response is returned, so fire-and-forget
 * background processing can never complete and in-memory job stores are
 * not shared between instances. Running the pipeline inline and
 * returning { jobId, status: "complete", result } is the only model
 * that works there. The status endpoint remains for persistent servers
 * that still use the polling path.
 */
export async function POST(req: NextRequest) {
  try {
    // After a restart, resume any analysis that was interrupted mid-run so
    // the polling client keeps seeing progress instead of a dead 404.
    triggerJobResume();

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

    // Fail fast on AI misconfiguration instead of creating a job that is
    // guaranteed to fail minutes later, after the user has been waiting.
    try {
      getAIProvider();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[extract] AI provider not configured:", message);
      return NextResponse.json(
        { error: "The analysis service isn't configured yet. Contact support or check the server logs." },
        { status: 503 }
      );
    }

    // Create the job and run the pipeline to completion. Awaiting keeps the
    // response (and therefore the result) alive on serverless platforms.
    const job = createJob("anonymous", file.name);
    setJobStage(job.id, "queued", 100);

    const startedAt = Date.now();
    await processExtraction(job.id, file, name);

    // Report the final state. Serverless clients read the result straight
    // from this response; polling clients keep using the status endpoint.
    const finalJob = getJob(job.id);
    if (finalJob?.status === "complete" && finalJob.result) {
      console.log(
        `[extract] complete job=${job.id} file="${file.name}" dur=${Date.now() - startedAt}ms`
      );
      return NextResponse.json({
        jobId: job.id,
        status: "complete",
        result: finalJob.result,
      });
    }
    if (finalJob?.status === "failed") {
      console.log(
        `[extract] failed job=${job.id} file="${file.name}" dur=${Date.now() - startedAt}ms reason=${finalJob.error ?? "unknown"}`
      );
      return NextResponse.json({
        jobId: job.id,
        status: "failed",
        error: finalJob.error ?? "Couldn't extract the terms from this file. Try another file.",
      });
    }
    // The pipeline must ALWAYS end in a terminal state. If it somehow did not
    // (e.g. the run was cut short without an explicit fail), record it as
    // failed rather than returning "queued" - on serverless a queued job is
    // unreachable from any later poll and the client would report a lost job.
    const reason =
      "The analysis did not complete. Please try again.";
    failJob(job.id, reason);
    console.error(`[extract] non-terminal job=${job.id} file="${file.name}" state=${finalJob?.status}`);
    return NextResponse.json({
      jobId: job.id,
      status: "failed",
      error: reason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract] request-level failure:", message);
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
}

/**
 * Background extraction processor.
 * Extracts text, saves it (so the job can resume after a restart), then
 * runs the staged pipeline and persists results.
 */
async function processExtraction(jobId: string, file: File, name: string) {
  const startTime = Date.now();

  try {
    // Stage 1: Upload
    setJobStage(jobId, "uploading", 50);

    // Stage 2: Text extraction
    setJobStage(jobId, "extracting_text", 0);
    const textStart = Date.now();
    const text = await extractFileText(file, name);
    const textMs = Date.now() - textStart;
    setJobStage(jobId, "extracting_text", 100);

    if (text.trim().length < 40) {
      failJob(jobId, "This file looks empty - no readable text found.");
      return;
    }

    // Persist the extracted text so an interrupted analysis can resume
    // after a server restart without the original file.
    saveJobText(jobId, text);

    // Stage 3-5: preprocessing, staged LLM extraction, validation
    await finishAnalysis(jobId, text, file.name);

    console.log(`[extract] Job ${jobId} pipeline finished in ${Date.now() - startTime}ms (text extraction ${textMs}ms)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    failJob(jobId, message);
    console.error(`[extract] Job ${jobId} failed after ${Date.now() - startTime}ms:`, message);
  }
}
