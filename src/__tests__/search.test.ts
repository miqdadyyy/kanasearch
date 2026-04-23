import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { search } from "../search.js";
import type { SearchResult } from "../types.js";

describe("search", () => {
  describe("empty / invalid input", () => {
    it("returns empty array for empty string", () => {
      assert.deepStrictEqual(search(""), []);
    });

    it("returns empty array for whitespace-only string", () => {
      assert.deepStrictEqual(search("   "), []);
    });
  });

  describe("exact match", () => {
    it("returns exact match with score 1.0", () => {
      const results = search("a");
      const exact = results.find((r) => r.romaji === "a");
      assert.ok(exact, "expected exact match for 'a'");
      assert.strictEqual(exact.score, 1);
    });

    it("returns hiragana and katakana when available", () => {
      const results = search("a");
      const exact = results.find((r) => r.romaji === "a");
      assert.ok(exact);
      assert.strictEqual(exact.hiragana, "あ");
      assert.strictEqual(exact.katakana, "ア");
    });

    it("returns null hiragana/katakana for compound readings", () => {
      const results = search("ai");
      const exact = results.find((r) => r.romaji === "ai");
      assert.ok(exact);
      assert.strictEqual(exact.hiragana, null);
      assert.strictEqual(exact.katakana, null);
    });

    it("returns kanji array with char and meaning", () => {
      const results = search("ai");
      const exact = results.find((r) => r.romaji === "ai");
      assert.ok(exact);
      assert.ok(exact.kanji.length > 0);
      const love = exact.kanji.find((k) => k.char === "愛");
      assert.ok(love, "expected kanji 愛 in results");
      assert.ok(love.meaning.includes("love"));
    });

    it("is case-insensitive", () => {
      const lower = search("ai");
      const upper = search("AI");
      const mixed = search("Ai");
      assert.strictEqual(lower[0].romaji, upper[0].romaji);
      assert.strictEqual(lower[0].romaji, mixed[0].romaji);
    });
  });

  describe("prefix match", () => {
    it("returns prefix matches with score 0.9", () => {
      const results = search("ai");
      const prefix = results.find((r) => r.romaji === "aida");
      assert.ok(prefix, "expected prefix match 'aida'");
      assert.strictEqual(prefix.score, 0.9);
    });

    it("returns multiple prefix matches", () => {
      const results = search("ai", { limit: 50, fuzzy: false });
      const prefixMatches = results.filter(
        (r) => r.romaji.startsWith("ai") && r.romaji !== "ai",
      );
      assert.ok(
        prefixMatches.length > 1,
        `expected multiple prefix matches, got ${prefixMatches.length}`,
      );
    });
  });

  describe("fuzzy match", () => {
    it("finds fuzzy matches when enabled (default)", () => {
      const results = search("nko", { limit: 10 });
      assert.ok(results.length > 0, "expected fuzzy results for 'nko'");
      const scores = results.map((r) => r.score);
      assert.ok(
        scores.some((s) => s < 0.9),
        "expected some fuzzy scores below 0.9",
      );
    });

    it("excludes fuzzy matches when disabled", () => {
      const results = search("nko", { fuzzy: false });
      assert.strictEqual(results.length, 0);
    });

    it("does not return results below fuzzy threshold", () => {
      const results = search("xyz");
      for (const r of results) {
        assert.ok(r.score >= 0.4, `score ${r.score} below threshold for ${r.romaji}`);
      }
    });
  });

  describe("options.limit", () => {
    it("defaults to 20 results", () => {
      const results = search("a");
      assert.ok(results.length <= 20);
    });

    it("respects custom limit", () => {
      const results = search("a", { limit: 3 });
      assert.ok(results.length <= 3);
    });

    it("returns fewer than limit when not enough matches", () => {
      const results = search("kyu", { limit: 100 });
      assert.ok(results.length < 100);
      assert.ok(results.length >= 1);
    });
  });

  describe("options.context", () => {
    it("ranks kanji by context relevance", () => {
      const withContext = search("ai", { context: "love", limit: 1 });
      assert.ok(withContext.length > 0);
      const kanji = withContext[0].kanji;
      assert.ok(kanji.length > 0);
      assert.strictEqual(
        kanji[0].char,
        "愛",
        `expected 愛 first with context "love", got ${kanji[0].char}`,
      );
    });

    it("returns different kanji order without context", () => {
      const withoutContext = search("ai", { limit: 1 });
      const withContext = search("ai", { context: "love", limit: 1 });
      const firstWithout = withoutContext[0].kanji[0].char;
      const firstWith = withContext[0].kanji[0].char;
      assert.strictEqual(firstWith, "愛");
      assert.notStrictEqual(firstWithout, "愛");
    });
  });

  describe("result shape", () => {
    it("returns SearchResult with all required fields", () => {
      const results = search("a");
      assert.ok(results.length > 0);
      const r = results[0];
      assert.strictEqual(typeof r.romaji, "string");
      assert.ok(r.hiragana === null || typeof r.hiragana === "string");
      assert.ok(r.katakana === null || typeof r.katakana === "string");
      assert.ok(Array.isArray(r.kanji));
      assert.strictEqual(typeof r.score, "number");
    });

    it("kanji entries have char and meaning array", () => {
      const results = search("ai");
      const kanji = results[0].kanji;
      assert.ok(kanji.length > 0);
      for (const k of kanji) {
        assert.strictEqual(typeof k.char, "string");
        assert.ok(Array.isArray(k.meaning));
        assert.ok(k.meaning.length > 0);
        for (const m of k.meaning) {
          assert.strictEqual(typeof m, "string");
        }
      }
    });
  });

  describe("sorting", () => {
    it("returns results sorted by score descending", () => {
      const results = search("ai", { limit: 50 });
      for (let i = 1; i < results.length; i++) {
        assert.ok(
          results[i - 1].score >= results[i].score,
          `results not sorted: index ${i - 1} (${results[i - 1].score}) < index ${i} (${results[i].score})`,
        );
      }
    });

    it("exact match appears before prefix match", () => {
      const results = search("ai");
      const exactIdx = results.findIndex((r) => r.romaji === "ai");
      const prefixIdx = results.findIndex((r) => r.romaji === "aida");
      assert.ok(exactIdx >= 0, "expected exact match");
      assert.ok(prefixIdx >= 0, "expected prefix match");
      assert.ok(
        exactIdx < prefixIdx,
        "exact match should appear before prefix match",
      );
    });
  });

  describe("kana-only entries", () => {
    it("returns kana entry with empty kanji array", () => {
      const results = search("kyu");
      const kyu = results.find((r) => r.romaji === "kyu");
      assert.ok(kyu, "expected match for 'kyu'");
      assert.strictEqual(kyu.hiragana, "きゅ");
      assert.strictEqual(kyu.katakana, "キュ");
      assert.deepStrictEqual(kyu.kanji, []);
    });
  });
});
