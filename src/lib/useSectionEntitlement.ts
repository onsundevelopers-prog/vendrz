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

interface EntitlementState {
  /** The section this resolved value belongs to. */
  section: string;
  locked: boolean | null;
}

export function useSectionEntitlement(section: string, clientLocked: boolean) {
  // The resolved server decision is stored together with the section it
  // belongs to, so a stale answer from a previous section is never treated
  // as authoritative (it falls back to the client hint until the new
  // section's check resolves). No state is set synchronously in the effect.
  const [state, setState] = useState<EntitlementState>({
    section,
    locked: null,
  });

  useEffect(() => {
    let alive = true;
    canAccessSection(section)
      .then((ok) => {
        if (alive) setState({ section, locked: !ok });
      })
      .catch(() => {
        // Server unreachable - fall back to the client-side hint.
        if (alive) setState({ section, locked: clientLocked });
      });
    return () => {
      alive = false;
    };
  }, [section, clientLocked]);

  // While the server is deciding, show the lock only if the client already
  // signals it (no flash of forbidden content for allowed users). Once known,
  // the server decision is authoritative.
  const known = state.section === section && state.locked !== null;
  const locked = known ? state.locked : clientLocked;
  return { checking: !known && !clientLocked, locked };
}
