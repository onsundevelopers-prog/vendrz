/**
 * JSON-LD structured data for search engines (Googlebot). Rendered
 * server-side so the markup is present in the first HTML response,
 * before any JavaScript runs.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
