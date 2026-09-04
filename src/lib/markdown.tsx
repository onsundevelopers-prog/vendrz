"use client";

/* ------------------------------------------------------------------ */
/*  Minimal markdown renderer for AI responses.                        */
/*                                                                     */
/*  Dependency-free (no remark/rehype): supports the subset the agent  */
/*  actually emits - headings, paragraphs, **bold**, *italic*, `code`, */
/*  fenced code blocks with language, lists, blockquotes, links,       */
/*  horizontal rules and tables. Rendered with `.ai-md` styling so the */
/*  result feels native to the interface rather than pasted HTML.      */
/* ------------------------------------------------------------------ */

import { memo } from "react";

type InlineNode =
  | { t: "text"; v: string }
  | { t: "bold"; v: string }
  | { t: "italic"; v: string }
  | { t: "code"; v: string }
  | { t: "link"; href: string; v: string };

const INLINE_RE =
  /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push({ t: "text", v: text.slice(last, idx) });
    if (m[2] !== undefined) nodes.push({ t: "bold", v: m[2] });
    else if (m[3] !== undefined) nodes.push({ t: "italic", v: m[3] });
    else if (m[4] !== undefined) nodes.push({ t: "code", v: m[4] });
    else if (m[5] !== undefined && m[6] !== undefined)
      nodes.push({ t: "link", href: m[6], v: m[5] });
    last = idx + m[0].length;
  }
  if (last < text.length) nodes.push({ t: "text", v: text.slice(last) });
  return nodes;
}

function Inline({ text }: { text: string }) {
  const nodes = parseInline(text);
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-fg">
                {n.v}
              </strong>
            );
          case "italic":
            return <em key={i}>{n.v}</em>;
          case "code":
            return <code key={i}>{n.v}</code>;
          case "link":
            return (
              <a key={i} href={n.href} target="_blank" rel="noreferrer noopener">
                {n.v}
              </a>
            );
          default:
            return <span key={i}>{n.v}</span>;
        }
      })}
    </>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="ai-codeblock group/code">
      <div className="flex h-7 items-center gap-2 border-b border-line/70 px-3.5">
        <span className="text-[10px] font-medium tracking-[-0.01em] text-faint">
          {lang || "code"}
        </span>
        <span className="ml-auto" />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Block({ node }: { node: BlockNode }) {
  switch (node.t) {
    case "h1":
      return <h1><Inline text={node.v} /></h1>;
    case "h2":
      return <h2><Inline text={node.v} /></h2>;
    case "h3":
      return <h3><Inline text={node.v} /></h3>;
    case "p":
      return <p><Inline text={node.v} /></p>;
    case "ul":
      return (
        <ul>
          {node.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {node.items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote>
          <Inline text={node.v} />
        </blockquote>
      );
    case "code":
      return <CodeBlock lang={node.lang} code={node.v} />;
    case "hr":
      return <hr />;
    case "table":
      return (
        <div className="ai-table-wrap">
          <table>
            <thead>
              <tr>
                {node.headers.map((h, i) => (
                  <th key={i}><Inline text={h} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}><Inline text={c} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

type BlockNode =
  | { t: "h1" | "h2" | "h3" | "p" | "blockquote"; v: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "code"; lang: string; v: string }
  | { t: "hr" }
  | { t: "table"; headers: string[]; rows: string[][] };

function parseBlocks(src: string): BlockNode[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] ?? "";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ t: "code", lang, v: buf.join("\n") });
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      blocks.push({ t: `h${level}` as "h1", v: h[2].trim() });
      i++;
      continue;
    }

    // hr
    if (/^\s*([-*_])\s*\1\s*\1(?:\s*\1)*\s*$/.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }

    // blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ t: "blockquote", v: buf.join(" ") });
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ t: "ul", items });
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ t: "ol", items });
      continue;
    }

    // table: header row + separator row
    if (
      i + 1 < lines.length &&
      /^\s*\|/.test(line) &&
      /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])
    ) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ t: "table", headers, rows });
      continue;
    }

    // plain paragraph - absorb following text lines until a blank line
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(```|#{1,3}\s|[-*+]\s|\d+\.\s|\s*>\s?|---+)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ t: "p", v: buf.join(" ") });
  }

  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Render markdown text as polished, native-looking content. */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="ai-md">
      {blocks.map((b, i) => (
        <Block key={i} node={b} />
      ))}
    </div>
  );
});

/** Lightweight partial markdown for live streaming - bold + inline code only. */
export function MarkdownStream({ text }: { text: string }) {
  const nodes = parseInline(text);
  return (
    <span className="ai-md-stream">
      {nodes.map((n, i) => {
        switch (n.t) {
          case "bold":
            return (
              <strong key={i} className="font-semibold text-fg">
                {n.v}
              </strong>
            );
          case "code":
            return <code key={i}>{n.v}</code>;
          case "link":
            return (
              <a key={i} href={n.href} target="_blank" rel="noreferrer noopener">
                {n.v}
              </a>
            );
          default:
            return <span key={i}>{n.v}</span>;
        }
      })}
    </span>
  );
}