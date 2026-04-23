export interface KanjiResult {
  char: string;
  meaning: string[];
}

export interface SearchResult {
  romaji: string;
  hiragana: string | null;
  katakana: string | null;
  kanji: KanjiResult[];
  score: number;
}

export interface SearchOptions {
  limit?: number;
  context?: string;
  fuzzy?: boolean;
}
