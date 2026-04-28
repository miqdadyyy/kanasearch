export interface KanjiResult {
  char: string;
  meaning: string[];
  jlpt?: number | null;
  grade?: number | null;
  freq?: number | null;
  stroke_count?: number | null;
  kun_readings?: string[];
  on_readings?: string[];
  name_readings?: string[];
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
  is_jlpt?: boolean;
  jlpt_level?: number;
}
