/* ------------------------------------------------------------------ */
/*  Legal page layout - shared by /privacy and /terms.                 */
/*  Each section is a title plus ordered blocks: paragraphs and        */
/*  bullet lists (with optional bolded lead-ins like "Right to         */
/*  Access"). The generator disclaimer renders as a muted footer.      */
/* ------------------------------------------------------------------ */

export type LegalBlock = string | { list: (string | { strong: string; text: string })[] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export function LegalDocument({
  eyebrow = "n4ma",
  title,
  updated,
  sections,
  disclaimer,
}: {
  eyebrow?: string;
  title: string;
  updated: string;
  sections: LegalSection[];
  disclaimer: string;
}) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm tracking-[-0.01em] text-zinc-500">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-sm text-zinc-400">{updated}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.blocks.map((block, i) => {
                  if (typeof block === "string") {
                    return (
                      <p key={i} className="leading-relaxed text-zinc-300">
                        {block}
                      </p>
                    );
                  }
                  return (
                    <ul key={i} className="list-disc space-y-2 pl-5 leading-relaxed text-zinc-300">
                      {block.list.map((item, j) =>
                        typeof item === "string" ? (
                          <li key={j}>{item}</li>
                        ) : (
                          <li key={j}>
                            <span className="font-semibold text-zinc-100">{item.strong}</span>
                            {item.text}
                          </li>
                        )
                      )}
                    </ul>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-zinc-800 pt-6 text-[12px] italic leading-relaxed text-zinc-500">
          {disclaimer}
        </p>
      </div>
    </main>
  );
}
