import { NextRequest, NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { createJob, failJob, getJob, saveJobText, setJobStage } from "@/lib/jobs";
import { extractFileText, finishAnalysis, triggerJobResume } from "@/lib/extractResume";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// On a long-running server (Render, local dev) the analysis can continue in
// the background after the response is sent, so the upload answers in under
// 2 seconds with a queued job id and the client shows a live progress page
// while polling /api/extract/status. On serverless (Vercel) the process is
// torn down when the response returns, so the pipeline must run inline and
// the finished result is returned with the POST - the client's polling path
// never starts because the job is already complete.
const canRunBackground =
  process.env.RENDER === "true" || process.env.NODE_ENV !== "production";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
// Multipart overhead (boundaries + other fields) on top of the raw file.
const MAX_BODY_BYTES = MAX_BYTES + 1024 * 1024;

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

    // Rate-limit anonymous abuse: the AI pipeline costs real quota per call,
    // and the flow is deliberately signup-free. Signed-in users are exempt;
    // when Clerk isn't configured everyone is anonymous and gets limited.
    const subject = await getRateSubject(req);
    const limit = rateLimit(subject);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many analyses from this connection. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    // Reject oversized uploads by the request body size BEFORE parsing it -
    // the serverless runtime refuses to parse multipart bodies over its
    // limit, so the per-file check below would never get the chance to run.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "File is larger than 25 MB." }, { status: 413 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      // The client always validates size before uploading, so a multipart
      // body that the runtime refuses to parse is a size rejection.
      return NextResponse.json(
        { error: "File is larger than 25 MB." },
        { status: 413 }
      );
    }
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

    // Create the job. On persistent servers kick the pipeline off in the
    // background and answer immediately with a queued job id; on serverless
    // run it inline (awaiting keeps the response - and therefore the result -
    // alive on platforms that tear down the process after replying).
    const job = createJob("anonymous", file.name);
    setJobStage(job.id, "queued", 100);

    if (canRunBackground) {
      void processExtraction(job.id, file, name).catch((err) => {
        console.error(`[extract] background job ${job.id} crashed:`, err);
      });
      return NextResponse.json({ jobId: job.id, status: "queued" });
    }

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
 * Rate-limit subject: the Clerk user id when a signed-in session exists
 * (so a user behind a shared NAT isn't throttled by neighbours), otherwise
 * the client IP. The Clerk import is dynamic so builds without Clerk keys
 * don't evaluate it at module load.
 */
async function getRateSubject(req: NextRequest): Promise<string> {
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const { userId } = await auth();
      if (userId) return `user:${userId}`;
    } catch {
      // Fall through to IP-based limiting.
    }
  }
  return `ip:${clientIp(req)}`;
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
