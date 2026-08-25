import { NextRequest, NextResponse } from "next/server";
import { extractContract, extractContractFromFile } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — matches the audit page pill

/**
 * POST /api/extract
 * Accepts a multipart file (PDF / DOCX / TXT / MD), extracts structured contract
 * data with Gemini, and returns it as JSON. Server-only — the key never leaves
 * the environment.
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
    let extraction;

    if (name.endsWith(".pdf")) {
      // Gemini reads PDFs natively — no client-side text extraction needed.
      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      extraction = await extractContractFromFile({
        mimeType: "application/pdf",
        base64Data: base64,
        filename: file.name,
      });
    } else if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      const text = await file.text();
      if (text.trim().length < 40) {
        return NextResponse.json(
          { error: "This file looks empty — no readable text found." },
          { status: 422 }
        );
      }
      extraction = await extractContract(text.slice(0, 60_000));
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = await mammoth.extractRawText({ buffer: buf });
      if (parsed.value.trim().length < 40) {
        return NextResponse.json(
          { error: "This DOCX looks empty — no readable text found." },
          { status: 422 }
        );
      }
      extraction = await extractContract(parsed.value.slice(0, 60_000));
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX, TXT, or Markdown." },
        { status: 400 }
      );
    }

    return NextResponse.json({ extraction, documentName: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
}
