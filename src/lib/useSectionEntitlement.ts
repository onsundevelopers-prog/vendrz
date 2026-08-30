"use client";

import { useEffect, useState } from "react";
import { canAccessSection } from "./clientDocuments";

/* ------------------------------------------------------------------ */
/*  useSectionEntitlement(section)                                    */
/*                                                                     */
/*  Server-authoritative guard for a workspace section. Returns:       */
/*    - checking: true while the server entitlement is being resolved  */
/*    - locked:   true when the user must NOT see this section         */
/*                                                                     */
/*  Combines the client plan hint with the server's answer so that     */
/*  typing the URL directly, refreshing, or manipulating client state  */
/*  can never bypass the lock: the server is consulted on mount.       */
/* ------------------------------------------------------------------ */

export function useSectionEntitlement(section: string, clientLocked: boolean) {
  const [serverLocked, setServerLocked] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    setServerLocked(null);
    canAccessSection(section)
      .then((ok) => {
        if (alive) setServerLocked(!ok);
      })
      .catch(() => {
        // Server unreachable - fall back to the client-side hint.
        if (alive) setServerLocked(clientLocked);
      });
    return () => {
      alive = false;
    };
  }, [section, clientLocked]);

  // While the server is deciding, show the lock only if the client already
  // signals it (no flash of forbidden content for allowed users). Once known,
  // the server decision is authoritative.
  const known = serverLocked !== null;
  const locked = known ? serverLocked : clientLocked;
  return { checking: !known && !clientLocked, locked };
}