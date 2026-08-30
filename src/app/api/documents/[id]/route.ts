import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteDocumentForUser, getDocumentForUser, getDocumentFileUrl } from "@/lib/documents";
import { rejectUnauthenticated } from "@/lib/serverAuth";

export const runtime = "nodejs";

/** GET /api/documents/[id]?file=1 - document metadata, or a signed file URL. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return rejectUnauthenticated();
  const id = (await params).id;
  const wantFile = req.nextUrl.searchParams.get("file") === "1";

  if (wantFile) {
    const url = await getDocumentFileUrl(userId, id);
    if (!url) {
      return NextResponse.json({ error: "File not found or not yours." }, { status: 404 });
    }
    return NextResponse.json({ url });
  }

  const doc = await getDocumentForUser(userId, id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found or not yours." }, { status: 404 });
  }
  return NextResponse.json({ document: doc });
}

/** DELETE /api/documents/[id] - remove the row AND the stored file. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return rejectUnauthenticated();
  const id = (await params).id;
  const result = await deleteDocumentForUser(userId, id);
  if (result === "not_found") {
    return NextResponse.json({ error: "Document not found or not yours." }, { status: 404 });
  }
  if (result === "error") {
    return NextResponse.json({ error: "Couldn't delete the document." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}