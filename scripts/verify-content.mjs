/* One-off content verification: fetches a page and counts old-brand and
   required N4MA terms in the served HTML. Run with:
   node scripts/verify-content.mjs [url] */
const url = process.argv[2] ?? "http://localhost:3000/";
const res = await fetch(url);
const html = (await res.text()).toLowerCase();
const count = (t) => html.split(t.toLowerCase()).length - 1;

const oldTerms = [
  "flask",
  "video feedback",
  "video-feedback",
  "product hunt",
  "#1 product",
  "voice feedback",
  "footage",
  "creative team",
];

const requiredTerms = [
  "n4ma",
  "ai financial watchdog",
  "business software",
  "contracts",
  "invoices",
  "subscriptions",
  "auto-renewal",
  "cancellation deadline",
  "price increase",
  "hidden fees",
  "unused licenses",
  "duplicate",
  "evidence",
  "annual",
  "renew",
  "renegotiate",
  "cancel",
  "30-day",
  "connect",
  "detect",
  "prove",
  "save",
  "illustrative example",
  "one-time $250 cad",
  "read-only",
  "gmail",
  "google drive",
  "slack",
];

let failed = false;

console.log(`Fetching ${url} ...`);
console.log("=== OLD TERMS (all must be 0) ===");
for (const t of oldTerms) {
  const n = count(t);
  if (n > 0) failed = true;
  console.log(t.padEnd(24), n);
}

console.log("=== REQUIRED TERMS (should be > 0) ===");
for (const t of requiredTerms) {
  const n = count(t);
  if (n === 0) failed = true;
  console.log(t.padEnd(24), n);
}

console.log(failed ? "FAIL" : "PASS");
process.exit(failed ? 1 : 0);
