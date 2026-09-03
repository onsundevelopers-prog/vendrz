import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  DriveReconnectRequiredError,
  fetchDriveFile,
  getValidAccessToken,
  listDriveFiles,
} from "@/lib/drive/oauth";

export const runtime = "nodejs";

/**
 * GET /api/drive/files?query=<text>&folder=<folderId>&pageToken=<token>
 *
 * Searches the user's Drive (or lists a folder's direct children). This
 * is a search/browse endpoint only - it never walks the Drive and never
 * returns file content, just metadata: name, type, modified date, owner
 * and folder location. A dead connection returns 401 with
 * `error: "reconnect_required"` so the UI can prompt for reconnection.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const query = (sp.get("query") ?? "").trim().slice(0, 200);
  // Browsing with no folder = the user's My Drive root (an explicit
  // location, never an unanchored walk over the whole Drive).
  const rawFolder = (sp.get("folder") ?? "").trim().slice(0, 120);
  const folderId = rawFolder || (query ? "" : "root");
  const pageToken = (sp.get("pageToken") ?? "").trim().slice(0, 2000);
  const rawPage = Number(sp.get("pageSize") ?? 25);
  const pageSize = Number.isFinite(rawPage)
    ? Math.min(Math.max(Math.round(rawPage), 1), 50)
    : 25;

  if (query && folderId) {
    return NextResponse.json(
      { error: "Provide either a search query or a folder, not both." },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(userId);

    // When browsing a folder, surface its own name for the breadcrumb.
    let folder: { id: string; name: string } | null = null;
    if (folderId) {
      if (folderId === "root") {
        folder = { id: "root", name: "My Drive" };
      } else {
        const meta = await fetchDriveFile(accessToken, folderId);
        if (!meta) {
          return NextResponse.json(
            { error: "This folder isn't accessible anymore. Search instead." },
            { status: 404 }
          );
        }
        folder = { id: meta.id, name: meta.name };
      }
    }

    const { files, nextPageToken } = await listDriveFiles(accessToken, {
      query,
      folderId: folderId || undefined,
      pageToken: pageToken || undefined,
      pageSize,
    });
    return NextResponse.json({ files, folder, nextPageToken, count: files.length });
  } catch (err) {
    if (err instanceof DriveReconnectRequiredError) {
      return NextResponse.json(
        { error: "reconnect_required", message: err.message },
        { status: 401 }
      );
    }
    console.error("[drive] files failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach Google Drive right now. Please try again." },
      { status: 502 }
    );
  }
}
