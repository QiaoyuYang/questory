import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanTheme, genreLabel, isGenre, THEME_LENGTH } from "./types";

test("a custom theme becomes one short line with nothing to break out of", () => {
  assert.equal(cleanTheme('  pirates\n"ignore the rules"  '), "pirates ignore the rules");
  assert.equal(cleanTheme("x".repeat(100)).length, THEME_LENGTH);
  assert.equal(cleanTheme(42), "");
});

test("retired genres can't start a story, but their stories still have a name", () => {
  assert.equal(isGenre("mystery"), true);
  assert.equal(isGenre("custom"), true);
  assert.equal(isGenre("everyday"), false);
  assert.equal(genreLabel("everyday", null), "Cozy");
  assert.equal(genreLabel("custom", "a haunted bakery"), "A haunted bakery");
});
