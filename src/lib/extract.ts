"use client";

/* ------------------------------------------------------------------ */
/*  Client-side extraction helper.                                     */
/*                                                                     */
/*  Shared by /upload and /audit. Uploads a file to /api/extract,      */
/*  polls the job until it reaches a terminal state, and returns the   */
/*  extracted terms + analysis.                                        */
/*                                                                     */
/*  Failure handling:                                                  */
/*  - A failed POST is retried (transient network blips).              */
/*  - A job that vanishes mid-poll (the server restarted or scaled)    */
/*    is re-uploaded automatically so the user never sees a dead end.  */
/*  - Server-reported job failures surface their real message.         */
/*  - Only genuine, repeated connectivity loss produces a network      */
/*    error instead of the misleading "job lost" message.              */
/* ------------------------------------------------------------------ */

import type { ContractExtraction, RichContractExtraction } from "./types";

export interface ExtractionResult {
  extraction: ContractExtraction;
  analysis: RichContractExtraction | null;
}

export type ExtractionErrorKind =
  | "network" // could not reach the server at all
  | "server" // the server answered but could not start/run the job
  | "job" // the job itself failed or was lost
  | "timeout"; // extraction legitimately took too long

export class ExtractionError extends Error {
  readonly kind: ExtractionErrorKind;
  constructor(message: string, kind: ExtractionErrorKind) {
    super(message);
    this.name = "ExtractionError";
    this.kind = kind;
  }
}

const TERMINAL = new Set(["complete", "failed"]);
const POLL_MS = 2000;
const MAX_WAIT_MS = 20 * 60 * 1000;
const MAX_POST_RETRIES = 2;
const MAX_JOB_REPOSTS = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface JobStatus {
  status?: string;
  error?: string;
  result?: { extraction?: ContractExtraction; analysis?: RichContractExtraction };
}

interface StartJobOutcome {
  /** When the server already finished the job synchronously (serverless),
      the result is returned with the POST and polling is unnecessary. */
  done: boolean;
  jobId: string;
  extraction?: ContractExtraction;
  analysis?: RichContractExtraction | null;
  failure?: string;
}

/** POST the file and return the job id, retrying transient failures. */
async function startJob(
  file: File
): Promise<StartJobOutcome> {
  let lastNetworkError = false;
  for (let attempt = 0; ; attempt++) {
    const form = new FormData();
    form.append("file", file);
    let res: Response;
    try {
      res = await fetch("/api/extract", { method: "POST", body: form });
    } catch {
      lastNetworkError = true;
      if (attempt < MAX_POST_RETRIES) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new ExtractionError(
        "Couldn't reach the analysis service. Check your connection and try again.",
        "network"
      );
    }
    const init = (await res.json().catch(() => null)) as {
      jobId?: string;
      status?: string;
      error?: string;
      result?: { extraction?: ContractExtraction; analysis?: RichContractExtraction };
    } | null;

    if (res.ok && init?.jobId) {
      // Serverless path: the POST itself ran the pipeline and returned the
      // finished (or failed) job - use it directly.
      if (init.status === "complete" && init.result?.extraction) {
        return {
          done: true,
          jobId: init.jobId,
          extraction: init.result.extraction,
          analysis: init.result.analysis ?? null,
        };
      }
      if (init.status === "failed") {
        return {
          done: true,
          jobId: init.jobId,
          failure: init.error ?? "Couldn't extract the terms from this file. Try another file.",
        };
      }
      // Persistent-server path: job was queued, poll for it.
      return { done: false, jobId: init.jobId };
    }
    if (res.status >= 500 && attempt < MAX_POST_RETRIES) {
      // Transient server error - back off and retry the upload.
      lastNetworkError = true;
      await sleep(1000 * (attempt + 1));
      continue;
    }
    throw new ExtractionError(
      init?.error ?? "Couldn't start the analysis. Try another file.",
      lastNetworkError ? "network" : "server"
    );
  }
}

type PollOutcome =
  | { done: true; extraction: ContractExtraction; analysis: RichContractExtraction | null }
  | { done: true; failure: string }
  | { done: false; reason: "network" | "server" | "lost" | "timeout" };

/** Poll one job until it terminates or is definitively lost. */
async function pollJob(jobId: string): Promise<PollOutcome> {
  const startedAt = Date.now();
  let consecutiveFailures = 0;

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    let statusRes: Response | null = null;
    let data: JobStatus | null = null;
    try {
      statusRes = await fetch(`/api/extract/status/${jobId}`);
      data = (await statusRes.json().catch(() => null)) as JobStatus | null;
    } catch {
      statusRes = null;
      data = null;
    }

    if (data && TERMINAL.has(data.status ?? "")) {
      if (data.status === "complete") {
        if (!data.result?.extraction) {
          return { done: true, failure: "Couldn't extract the terms from this file. Try another file." };
        }
        return {
          done: true,
          extraction: data.result.extraction,
          analysis: data.result.analysis ?? null,
        };
      }
      return { done: true, failure: data.error ?? "Couldn't extract the terms from this file. Try another file." };
    }

    if (!statusRes || !data) {
      // Network-level failure. Only give up after repeated consecutive drops.
      consecutiveFailures += 1;
      if (consecutiveFailures >= 3) {
        return {
          done: false,
          reason: "network",
        };
      }
    } else if (statusRes.status === 404) {
      // The job is gone - the server restarted or the job expired. The
      // caller re-uploads the file to start a fresh job.
      return { done: false, reason: "lost" };
    } else if (!statusRes.ok) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 3) {
        return { done: false, reason: "server" };
      }
    } else {
      consecutiveFailures = 0;
    }
    await sleep(POLL_MS);
  }

  return {
    done: false,
    reason: "timeout",
  };
}

/**
 * Upload `file` and wait for its analysis to finish.
 * Returns the extracted terms, or throws an ExtractionError with a
 * message that is safe to show the user.
 */
export async function analyzeFile(file: File): Promise<ExtractionResult> {
  let jobReposts = 0;

  while (true) {
    const started = await startJob(file);

    // The server finished the job inside the POST (serverless) - done.
    if (started.done) {
      if (started.failure) {
        throw new ExtractionError(started.failure, "job");
      }
      return {
        extraction: started.extraction as ContractExtraction,
        analysis: started.analysis ?? null,
      };
    }

    const outcome = await pollJob(started.jobId);

    if (outcome.done) {
      if ("failure" in outcome) {
        throw new ExtractionError(outcome.failure, "job");
      }
      return { extraction: outcome.extraction, analysis: outcome.analysis };
    }

    switch (outcome.reason) {
      case "network":
        throw new ExtractionError(
          "Couldn't reach the analysis service. Check your connection and try again.",
          "network"
        );
      case "server":
        throw new ExtractionError(
          "The analysis service had a problem. Please try again in a moment.",
          "server"
        );
      case "lost":
        if (jobReposts >= MAX_JOB_REPOSTS) {
          throw new ExtractionError(
            "The analysis was interrupted and couldn't be resumed. Please try again.",
            "job"
          );
        }
        jobReposts += 1;
        // Re-upload the file to recover from a lost job.
        continue;
      case "timeout":
        throw new ExtractionError(
          "The analysis is taking longer than expected. Your file is still being processed - check your workspace shortly.",
          "timeout"
        );
    }
  }
}
