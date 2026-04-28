import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const kanjiPath = join(__dirname, "..", "dicts", "kanji_jlpt_only.json");
const romajiPath = join(__dirname, "..", "dicts", "romaji_kanji.json");

// ── Kana → Romaji conversion tables ──

const HIRAGANA_MAP = {
  // Basic vowels
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  // K-row
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  // S-row
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  // T-row
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  // N-row
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  // H-row
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  // M-row
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  // Y-row
  "や": "ya", "ゆ": "yu", "よ": "yo",
  // R-row
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  // W-row
  "わ": "wa", "ゐ": "wi", "ゑ": "we", "を": "wo",
  // N
  "ん": "n",
  // Dakuten (voiced)
  "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
  "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
  "だ": "da", "ぢ": "di", "づ": "du", "で": "de", "ど": "do",
  "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
  // Handakuten
  "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
  // Small kana (for combos)
  "ゃ": "ya", "ゅ": "yu", "ょ": "yo",
  "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o",
  "っ": "tsu",
};

const KATAKANA_MAP = {
  // Basic vowels
  "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
  // K-row
  "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
  // S-row
  "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
  // T-row
  "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
  // N-row
  "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
  // H-row
  "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
  // M-row
  "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
  // Y-row
  "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
  // R-row
  "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
  // W-row
  "ワ": "wa", "ヰ": "wi", "ヱ": "we", "ヲ": "wo",
  // N
  "ン": "n",
  // Dakuten
  "ガ": "ga", "ギ": "gi", "グ": "gu", "ゲ": "ge", "ゴ": "go",
  "ザ": "za", "ジ": "ji", "ズ": "zu", "ゼ": "ze", "ゾ": "zo",
  "ダ": "da", "ヂ": "di", "ヅ": "du", "デ": "de", "ド": "do",
  "バ": "ba", "ビ": "bi", "ブ": "bu", "ベ": "be", "ボ": "bo",
  // Handakuten
  "パ": "pa", "ピ": "pi", "プ": "pu", "ペ": "pe", "ポ": "po",
  // Small kana
  "ャ": "ya", "ュ": "yu", "ョ": "yo",
  "ァ": "a", "ィ": "i", "ゥ": "u", "ェ": "e", "ォ": "o",
  "ッ": "tsu",
};

const COMBO_MAP = {
  // Hiragana combos
  "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
  "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
  "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
  "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
  "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
  "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
  "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
  "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
  "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
  "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
  "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
  // Katakana combos
  "キャ": "kya", "キュ": "kyu", "キョ": "kyo",
  "シャ": "sha", "シュ": "shu", "ショ": "sho",
  "チャ": "cha", "チュ": "chu", "チョ": "cho",
  "ニャ": "nya", "ニュ": "nyu", "ニョ": "nyo",
  "ヒャ": "hya", "ヒュ": "hyu", "ヒョ": "hyo",
  "ミャ": "mya", "ミュ": "myu", "ミョ": "myo",
  "リャ": "rya", "リュ": "ryu", "リョ": "ryo",
  "ギャ": "gya", "ギュ": "gyu", "ギョ": "gyo",
  "ジャ": "ja", "ジュ": "ju", "ジョ": "jo",
  "ビャ": "bya", "ビュ": "byu", "ビョ": "byo",
  "ピャ": "pya", "ピュ": "pyu", "ピョ": "pyo",
  // Extended katakana combos
  "ティ": "ti", "ディ": "di", "デュ": "dyu",
  "ファ": "fa", "フィ": "fi", "フェ": "fe", "フォ": "fo",
  "ウィ": "wi", "ウェ": "we", "ウォ": "wo",
  "ヴァ": "va", "ヴィ": "vi", "ヴ": "vu", "ヴェ": "ve", "ヴォ": "vo",
};

const ALL_KANA = { ...HIRAGANA_MAP, ...KATAKANA_MAP };

/**
 * Convert a kana string to romaji.
 * Handles combos (きゃ→kya), small tsu doubling, long vowel marks, 
 * and strips non-kana markers like dots and dashes used in readings.
 */
function kanaToRomaji(kana) {
  // Strip reading annotation markers: dots (.) and leading/trailing dashes (-)
  // e.g. "ひと.つ" → "hitotsu", "-あ.がり" → "agari"
  let cleaned = kana.replace(/[.\-]/g, "");
  if (!cleaned) return "";

  let result = "";
  let i = 0;

  while (i < cleaned.length) {
    // Check for two-char combos first
    if (i + 1 < cleaned.length) {
      const pair = cleaned[i] + cleaned[i + 1];
      if (COMBO_MAP[pair]) {
        result += COMBO_MAP[pair];
        i += 2;
        continue;
      }
    }

    const ch = cleaned[i];

    // Small tsu (っ/ッ) → double the next consonant
    if (ch === "っ" || ch === "ッ") {
      if (i + 1 < cleaned.length) {
        // Look ahead for combo
        let nextRomaji;
        if (i + 2 < cleaned.length) {
          const nextPair = cleaned[i + 1] + cleaned[i + 2];
          if (COMBO_MAP[nextPair]) {
            nextRomaji = COMBO_MAP[nextPair];
          }
        }
        if (!nextRomaji) {
          nextRomaji = ALL_KANA[cleaned[i + 1]] || "";
        }
        if (nextRomaji) {
          result += nextRomaji[0]; // double the consonant
        }
      }
      i++;
      continue;
    }

    // Long vowel mark (ー) → repeat previous vowel
    if (ch === "ー") {
      if (result.length > 0) {
        const lastChar = result[result.length - 1];
        const vowels = "aiueo";
        if (vowels.includes(lastChar)) {
          result += lastChar;
        }
      }
      i++;
      continue;
    }

    // Regular kana
    if (ALL_KANA[ch]) {
      result += ALL_KANA[ch];
    }
    // Skip unknown characters (rare edge cases)

    i++;
  }

  return result;
}

/**
 * Convert an array of kana readings to romaji strings.
 */
function convertReadings(readings) {
  return readings.map(r => kanaToRomaji(r)).filter(r => r.length > 0);
}

// ── Main ──

const kanjiData = JSON.parse(readFileSync(kanjiPath, "utf-8"));
const romajiData = JSON.parse(readFileSync(romajiPath, "utf-8"));

// Build a lookup: kanji char → metadata from kanji_jlpt_only.json
const kanjiMeta = new Map();
for (const [char, data] of Object.entries(kanjiData)) {
  kanjiMeta.set(char, {
    jlpt: data.jlpt,
    grade: data.grade,
    freq_mainichi_shinbun: data.freq_mainichi_shinbun,
    stroke_count: data.stroke_count,
    kun_readings: convertReadings(data.kun_readings || []),
    on_readings: convertReadings(data.on_readings || []),
    name_readings: convertReadings(data.name_readings || []),
  });
}

// Enrich romaji_kanji.json entries
let enriched = 0;
let total = 0;

for (const [romaji, entry] of Object.entries(romajiData)) {
  if (!entry.kanji) continue;
  for (const kanjiEntry of entry.kanji) {
    total++;
    const char = kanjiEntry.char;
    const meta = kanjiMeta.get(char);
    if (meta) {
      kanjiEntry.jlpt = meta.jlpt;
      kanjiEntry.grade = meta.grade;
      kanjiEntry.freq = meta.freq_mainichi_shinbun;
      kanjiEntry.stroke_count = meta.stroke_count;
      kanjiEntry.kun_readings = meta.kun_readings;
      kanjiEntry.on_readings = meta.on_readings;
      kanjiEntry.name_readings = meta.name_readings;
      enriched++;
    }
  }
}

writeFileSync(romajiPath, JSON.stringify(romajiData, null, 2) + "\n", "utf-8");

console.log(`Enriched ${enriched} / ${total} kanji entries across ${Object.keys(romajiData).length} romaji keys`);
console.log(`JLPT kanji available: ${kanjiMeta.size}`);

// Verify a sample
const sample = romajiData["ai"]?.kanji?.find(k => k.char === "愛");
if (sample) {
  console.log("\nSample — 愛 (ai):");
  console.log(JSON.stringify(sample, null, 2));
}
