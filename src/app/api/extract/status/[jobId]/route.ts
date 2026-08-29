import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { triggerJobResume } from "@/lib/extractResume";

/**
 * GET /api/extract/status/[jobId]
 * Returns the current status of an extraction job.
 * The frontend polls this endpoint every 2-3 seconds during processing.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // If the server restarted mid-analysis, kick off a resume so the client
  // keeps polling the same job instead of hitting a dead 404.
  triggerJobResume();

  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    overallProgress: job.overallProgress,
    error: job.error,
    filename: job.filename,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    // Only include result when complete
    ...(job.status === "complete" && job.result ? { result: job.result } : {}),
  });
}
