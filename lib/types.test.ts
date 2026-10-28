import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanTheme, genreLabel, isGenre, readNewInvite, THEME_LENGTH } from "./types";

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

test("a link sent before its case began brings a well-formed id and code, or nothing", () => {
  const storyId = "0f8c2a4e-5b1d-4c3e-9a7f-1e2d3c4b5a69";
  const code = "7d9e1f20-3a4b-4c5d-8e6f-a1b2c3d4e5f6";
  assert.deepEqual(readNewInvite({ storyId, code, sent: true }), { storyId, code });
  assert.equal(readNewInvite({ storyId: "../stories/x", code }), null);
  assert.equal(readNewInvite({ storyId }), null);
  assert.equal(readNewInvite("nope"), null);
  assert.equal(readNewInvite(null), null);
});
