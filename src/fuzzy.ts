export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

export function fuzzyScore(query: string, target: string): number {
  if (target === query) return 1;
  if (target.startsWith(query)) return 0.9;
  if (target.includes(query)) return 0.7;

  const dist = levenshtein(query, target);
  const maxLen = Math.max(query.length, target.length);
  if (maxLen === 0) return 1;

  const similarity = 1 - dist / maxLen;
  return Math.max(0, similarity);
}
