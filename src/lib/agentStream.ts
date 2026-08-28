"use client";

/* ------------------------------------------------------------------ */
/*  Minimal SSE-over-fetch client. EventSource only supports GET, but  */
/*  our orchestrator needs a POST body (the real data), so we read     */
/*  the response stream of a fetch POST and parse SSE frames.          */
/* ------------------------------------------------------------------ */

export type StreamHandler = (event: string, data: unknown) => void;
export type StreamDone = (ok: boolean) => void;

export interface OpenStreamResult {
  /** Manually abort the stream (e.g. on unmount). */
  close: () => void;
}

export function openAgentStream(
  url: string,
  body: unknown,
  handlers: { onEvent?: StreamHandler; onDone?: StreamDone; onError?: (msg: string) => void }
): OpenStreamResult {
  const controller = new AbortController();
  let closed = false;

  void (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        let detail = "";
        try {
          detail = JSON.parse(text || "{}").error ?? text;
        } catch {
          detail = text;
        }
        handlers.onError?.(detail || `Request failed (${res.status})`);
        handlers.onDone?.(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE frames are separated by a blank line.
        let sep = buffer.indexOf("\n\n");
        while (sep >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          handleFrame(frame, handlers.onEvent);
          sep = buffer.indexOf("\n\n");
        }
      }

      // Flush any trailing complete frame.
      handleFrame(buffer, handlers.onEvent);
      handlers.onDone?.(true);
    } catch (err) {
      if (closed || (err instanceof DOMException && err.name === "AbortError")) return;
      handlers.onError?.(err instanceof Error ? err.message : "Stream error");
      handlers.onDone?.(false);
    }
  })();

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}

function handleFrame(frame: string, onEvent?: StreamHandler): void {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;
  const raw = dataLines.join("\n");
  try {
    const parsed = JSON.parse(raw);
    onEvent?.(eventName, parsed);
  } catch {
    /* ignore malformed frames */
  }
}

/**
 * Read an SSE stream from a GET endpoint (used to resume a running task
 * after a reload). Same frame parsing as openAgentStream.
 */
export function openAgentStreamGet(
  url: string,
  handlers: { onEvent?: StreamHandler; onDone?: StreamDone; onError?: (msg: string) => void }
): OpenStreamResult {
  const controller = new AbortController();
  let closed = false;

  void (async () => {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        let detail = "";
        try {
          detail = JSON.parse(text || "{}").error ?? text;
        } catch {
          detail = text;
        }
        handlers.onError?.(detail || `Request failed (${res.status})`);
        handlers.onDone?.(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep = buffer.indexOf("\n\n");
        while (sep >= 0) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          handleFrame(frame, handlers.onEvent);
          sep = buffer.indexOf("\n\n");
        }
      }
      handleFrame(buffer, handlers.onEvent);
      handlers.onDone?.(true);
    } catch (err) {
      if (closed || (err instanceof DOMException && err.name === "AbortError")) return;
      handlers.onError?.(err instanceof Error ? err.message : "Stream error");
      handlers.onDone?.(false);
    }
  })();

  return {
    close: () => {
      closed = true;
      controller.abort();
    },
  };
}