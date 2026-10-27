import assert from "node:assert/strict";
import { test } from "node:test";
import { currentChapter, formatMinutes, formatPlaces, walkStats } from "./walk";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 9, 0) + minute * 60_000).toISOString();
const turn = (kind: string, minute: number, photo = true) => ({
  kind,
  createdAt: at(minute),
  photoUrl: photo ? "/api/media/x.jpg" : null,
});

test("adds up the time between photos and counts the places", () => {
  const turns = [turn("genesis", 0), turn("photo", 6), turn("photo", 15), turn("photo", 24)];
  assert.deepEqual(walkStats(turns), { minutes: 24, places: 4 });
});

test("a long gap is a break, not walking", () => {
  const turns = [turn("photo", 0), turn("photo", 10), turn("photo", 10 + 60 * 18), turn("photo", 10 + 60 * 18 + 5)];
  assert.deepEqual(walkStats(turns), { minutes: 15, places: 4 });
});

test("ending a walk counts the time but not a place", () => {
  const turns = [turn("resume", 0), turn("photo", 8), turn("end", 12, false)];
  assert.deepEqual(walkStats(turns), { minutes: 12, places: 2 });
});

test("the current chapter starts at the newest opening photo", () => {
  const turns = [turn("genesis", 0), turn("photo", 5), turn("end", 9, false), turn("resume", 300), turn("photo", 310)];
  assert.deepEqual(
    currentChapter(turns).map((t) => t.kind),
    ["resume", "photo"],
  );
});

test("formats time and places for the summary", () => {
  assert.equal(formatMinutes(1), "1 minute");
  assert.equal(formatMinutes(24), "24 minutes");
  assert.equal(formatMinutes(60), "1 hour");
  assert.equal(formatMinutes(72), "1 hour 12 minutes");
  assert.equal(formatMinutes(121), "2 hours 1 minute");
  assert.equal(formatPlaces(1), "1 place");
  assert.equal(formatPlaces(5), "5 places");
});
