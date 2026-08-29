/* ------------------------------------------------------------------ */
/*  Job Queue - async job processing with disk persistence.           */
/*                                                                     */
/*  Each extraction job is tracked with a unique ID and progresses     */
/*  through stages. The frontend polls /api/extract/status/:jobId      */
/*  for real-time status instead of waiting for the full extraction.   */
/*                                                                     */
/*  Jobs are persisted to disk (EXTRACT_JOB_FILE, default              */
/*  .data/extract-jobs.json) so a server restart doesn't lose an       */
/*  in-flight analysis. On the next request after a restart,           */
/*  interrupted jobs are resumed (see lib/extractResume.ts) or marked  */
/*  failed with a clear message. Disk IO is best-effort: if the file   */
/*  can't be written the store degrades to memory-only.                */
/*                                                                     */
/*  Production note: for multi-process scaling replace with Redis/DB.  */
/* ------------------------------------------------------------------ */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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
  /** Extracted document text, saved once available so an interrupted
      analysis can be resumed after a restart without the original file. */
  text?: string;
}

export interface ExtractionResult {
  extraction: unknown; // ContractExtraction
  analysis: unknown; // RichContractExtraction
  documentName: string;
}

// Job store (server-scoped, persisted to disk)
const jobs = new Map<string, ExtractionJob>();

const JOB_TTL_MS = 60 * 60 * 1000; // jobs are kept for 1 hour
const JOB_FILE = process.env.EXTRACT_JOB_FILE || ".data/extract-jobs.json";

/* ------------------------- disk persistence ------------------------- */

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function flushPersist(): void {
  persistTimer = null;
  try {
    mkdirSync(dirname(JOB_FILE), { recursive: true });
    writeFileSync(JOB_FILE, JSON.stringify([...jobs.values()]));
  } catch {
    // Disk unavailable (e.g. read-only serverless filesystem) - the store
    // keeps working in memory; jobs just won't survive a restart.
  }
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(flushPersist, 400);
}

function loadJobs(): void {
  try {
    const raw = readFileSync(JOB_FILE, "utf8");
    const stored = JSON.parse(raw) as ExtractionJob[];
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const job of stored) {
      if (new Date(job.createdAt).getTime() < cutoff) continue;
      jobs.set(job.id, job);
    }
  } catch {
    // No persisted file yet, or it can't be read - start empty.
  }
}

loadJobs();

/**
 * Drop jobs older than the TTL. Called opportunistically so the map never
 * grows without bound on a long-running server.
 */
function purgeExpiredJobs(): void {
  const cutoff = Date.now() - JOB_TTL_MS;
  let changed = false;
  for (const [id, job] of jobs) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      jobs.delete(id);
      changed = true;
    }
  }
  if (changed) schedulePersist();
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
  schedulePersist();
  return job;
}

export function getJob(id: string): ExtractionJob | null {
  return jobs.get(id) ?? null;
}

export function listJobs(): ExtractionJob[] {
  return [...jobs.values()];
}

export function updateJob(id: string, patch: Partial<ExtractionJob>): ExtractionJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  const updated = { ...job, ...patch, updatedAt: new Date().toISOString() };
  jobs.set(id, updated);
  schedulePersist();
  return updated;
}

export function completeJob(id: string, result: ExtractionResult): ExtractionJob | null {
  const updated = updateJob(id, { status: "complete", overallProgress: 100, progress: 100, result });
  // Persist terminal states immediately so a crash right after completion
  // can't lose the result.
  if (updated) flushPersist();
  return updated;
}

export function failJob(id: string, error: string): ExtractionJob | null {
  const updated = updateJob(id, { status: "failed", error });
  if (updated) flushPersist();
  return updated;
}

/** Persist the extracted text so the analysis can resume after a restart. */
export function saveJobText(id: string, text: string): ExtractionJob | null {
  const updated = updateJob(id, { text });
  if (updated) flushPersist();
  return updated;
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
