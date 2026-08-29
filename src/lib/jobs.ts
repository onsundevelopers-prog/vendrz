/* ------------------------------------------------------------------ */
/*  Job Queue - in-memory async job processing.                       */
/*                                                                     */
/*  Each extraction job is tracked with a unique ID and progresses     */
/*  through stages. The frontend polls /api/extract/status/:jobId      */
/*  for real-time status instead of waiting for the full extraction.   */
/*                                                                     */
/*  Production note: Replace with Redis/DB for multi-process scaling.  */
/* ------------------------------------------------------------------ */

export type ExtractionStage =
  | "queued"
  | "uploading"
  | "extracting_text"
  | "preprocessing"
  | "analyzing"
  | "validating"
  | "persisting"
  | "complete"
  | "failed";

export interface ExtractionJob {
  id: string;
  userId: string;
  filename: string;
  status: ExtractionStage;
  /** 0-100 progress within the current stage */
  progress: number;
  /** Overall progress across all stages (0-100) */
  overallProgress: number;
  error?: string;
  result?: ExtractionResult;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionResult {
  extraction: unknown; // ContractExtraction
  analysis: unknown; // RichContractExtraction
  documentName: string;
}

// In-memory job store (server-scoped)
const jobs = new Map<string, ExtractionJob>();

const JOB_TTL_MS = 60 * 60 * 1000; // jobs are kept for 1 hour

/**
 * Drop jobs older than the TTL. Called opportunistically so the map never
 * grows without bound on a long-running server.
 */
function purgeExpiredJobs(): void {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      jobs.delete(id);
    }
  }
}

export function createJob(userId: string, filename: string): ExtractionJob {
  // Keep the map bounded - purge expired entries on each new job.
  if (jobs.size > 64) purgeExpiredJobs();
  const id = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const job: ExtractionJob = {
    id,
    userId,
    filename,
    status: "queued",
    progress: 0,
    overallProgress: 0,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ExtractionJob | null {
  return jobs.get(id) ?? null;
}

export function updateJob(id: string, patch: Partial<ExtractionJob>): ExtractionJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  const updated = { ...job, ...patch, updatedAt: new Date().toISOString() };
  jobs.set(id, updated);
  return updated;
}

export function completeJob(id: string, result: ExtractionResult): ExtractionJob | null {
  return updateJob(id, { status: "complete", overallProgress: 100, progress: 100, result });
}

export function failJob(id: string, error: string): ExtractionJob | null {
  return updateJob(id, { status: "failed", error });
}

/** Stage weights for overall progress calculation. */
const STAGE_WEIGHTS: Record<ExtractionStage, number> = {
  queued: 0,
  uploading: 5,
  extracting_text: 15,
  preprocessing: 10,
  analyzing: 50,
  validating: 10,
  persisting: 5,
  complete: 100,
  failed: 0,
};

const STAGE_ORDER: ExtractionStage[] = [
  "queued", "uploading", "extracting_text", "preprocessing",
  "analyzing", "validating", "persisting", "complete",
];

export function setJobStage(id: string, stage: ExtractionStage, progress: number = 0): void {
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const completedWeight = STAGE_ORDER.slice(0, stageIndex).reduce((s, st) => s + STAGE_WEIGHTS[st], 0);
  const currentWeight = STAGE_WEIGHTS[stage] * (progress / 100);
  const overall = Math.min(100, Math.round(completedWeight + currentWeight));
  updateJob(id, { status: stage, progress, overallProgress: overall });
}
