export async function collectPages<T>(fetchPage: (cursor: string | null) => Promise<{
  nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null }
}>): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  for (;;) {
    const page = await fetchPage(cursor);
    results.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return results;
    const next = page.pageInfo.endCursor;
    if (!next || seen.has(next)) throw new Error('Invalid pagination cursor');
    seen.add(next);
    cursor = next;
  }
}
