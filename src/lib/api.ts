/* ------------------------------------------------------------------ */
/*  API contract - n4ma                                      */
/*                                                                     */
/*  The UI talks to these functions. Today they are backed by a        */
/*  localStorage store so the entire flow works with zero backend.     */
/*  Each maps 1:1 to a FastAPI endpoint below - swapping in the real   */
/*  server is a matter of replacing the bodies with fetch() calls.     */
/*                                                                     */
/*  POST   /api/v1/contracts/upload        → createAnonymousSession    */
/*  GET    /api/v1/jobs/{job_id}           → session.pipelineStatus    */
/*  GET    /api/v1/results/{session_id}    → session.result            */
/*  Auth is handled by Clerk (@clerk/nextjs) - there is no fallback auth. */
/*  POST   /api/v1/sessions/{id}/transfer  → transferSessionToAccount    */
/*  POST   /api/v1/gmail/connect           → connectGmail              */
/*  POST   /api/v1/gmail/disconnect        → disconnectGmail           */
/*  POST   /api/v1/gmail/discovery/run     → runDiscovery              */
/*  POST   /api/v1/gmail/discovery/import  → markImported              */
/*  GET    /api/v1/org/contracts           → getContracts              */
/*  GET    /api/v1/org/stats               → getDashboardStats         */
/* ------------------------------------------------------------------ */

export {
  getSession,
  saveSession,
  updateSession,
  createAnonymousSession,
  transferSessionToAccount,
  getGmailConnection,
  connectGmail,
  disconnectGmail,
  getDiscovery,
  runDiscovery,
  markImported,
  getContracts,
  getVendorProfile,
  getDashboardStats,
} from "./store";
