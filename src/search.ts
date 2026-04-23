import { dict, type DictEntry } from "./data.js";
import { fuzzyScore } from "./fuzzy.js";
import type { KanjiResult, SearchOptions, SearchResult } from "./types.js";

const EXACT_THRESHOLD = 1.0;
const PREFIX_THRESHOLD = 0.9;
const FUZZY_MIN_THRESHOLD = 0.4;

let sortedKeys: string[] | null = null;

function getKeys(): string[] {
  if (!sortedKeys) {
    sortedKeys = dict.map((e) => e[0]);
  }
  return sortedKeys;
}

function entryToResult(
  entry: DictEntry,
  score: number,
  context?: string,
): SearchResult {
  const [romaji, hiragana, katakana, kanjiRaw] = entry;

  let kanji: KanjiResult[] = kanjiRaw.map(([char, meaning]) => ({
    char,
    meaning,
  }));

  if (context) {
    kanji = rankByContext(kanji, context);
  }

  return { romaji, hiragana, katakana, kanji, score };
}

function rankByContext(kanji: KanjiResult[], context: string): KanjiResult[] {
  const ctx = context.toLowerCase();
  const terms = ctx.split(/\s+/).filter(Boolean);

  const scored = kanji.map((k) => {
    let contextScore = 0;
    for (const meaning of k.meaning) {
      const m = meaning.toLowerCase();
      for (const term of terms) {
        if (m === term) {
          contextScore += 10;
        } else if (m.includes(term)) {
          contextScore += 5;
        } else if (term.includes(m)) {
          contextScore += 3;
        }
      }
    }
    return { entry: k, contextScore };
  });

  scored.sort((a, b) => b.contextScore - a.contextScore);
  return scored.map((s) => s.entry);
}

function binarySearchPrefix(keys: string[], prefix: string): number {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (keys[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function search(
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const { limit = 20, context, fuzzy = true } = options;
  const q = query.toLowerCase().trim();

  if (!q) return [];

  const keys = getKeys();
  const results: SearchResult[] = [];

  const startIdx = binarySearchPrefix(keys, q);
  for (let i = startIdx; i < keys.length && keys[i].startsWith(q); i++) {
    const entry = dict[i];
    const score = entry[0] === q ? EXACT_THRESHOLD : PREFIX_THRESHOLD;
    results.push(entryToResult(entry, score, context));
  }

  if (fuzzy && results.length < limit) {
    const seen = new Set(results.map((r) => r.romaji));
    const maxDist = Math.max(1, Math.floor(q.length * 0.4));

    for (let i = 0; i < dict.length && results.length < limit * 2; i++) {
      const key = keys[i];
      if (seen.has(key)) continue;

      if (Math.abs(key.length - q.length) > maxDist) continue;

      const score = fuzzyScore(q, key);
      if (score >= FUZZY_MIN_THRESHOLD) {
        seen.add(key);
        results.push(entryToResult(dict[i], score, context));
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
