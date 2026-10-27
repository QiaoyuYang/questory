import type { Outcome, TurnView } from "@/lib/types";

// A side note gets no label: the narration says what the photo added.
const OUTCOME: Record<Outcome, string | null> = {
  follows_quest: "Quest complete",
  moves_story: "The story moves on",
  side_note: null,
};

const KIND: Record<TurnView["kind"], string> = {
  genesis: "The beginning",
  photo: "Something you noticed",
  resume: "A new chapter",
  end: "Walk ended",
};

/** What the photo did for the story, when it moved it. */
export function outcomeLabel(turn: TurnView): string | null {
  return turn.outcome ? OUTCOME[turn.outcome] : null;
}

/** A short name for a turn in the journal. */
export function turnLabel(turn: TurnView): string {
  return outcomeLabel(turn) ?? KIND[turn.kind];
}
