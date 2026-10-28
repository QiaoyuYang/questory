import "server-only";
import { GAME_MASTER, GENRES } from "@/lib/types";
import { unfinishedBeats, type Lead } from "./beats";
import { CHAPTERS, LEAD_STEPS, STEPS_PER_CHAPTER, otherLead, seatOf, singleLead, stepsLeft } from "./rules";
import type { StoryState } from "./state";

const SAFETY = `Safety and respect, always:
- Never ask the player to enter roads or traffic, trespass, climb anything, enter private property or businesses, touch or move other people's things, or approach strangers.
- A closer look never means touching, opening, lifting or reaching into anything.
- Never make a person the target and never ask for photos of people. If people appear in a photo, leave them out of the story.
- Never ask the player to read or photograph anything that identifies a person or household: names on doorbells, mailboxes or mail, license plates, screens or documents.
- Targets are public, static and safe to walk up to: buildings, doors, signs, plants, trees, street furniture, public art, landmarks, colors, shapes.
- Keep everything suitable for all ages.`;

export const GM_INSTRUCTIONS = `You are ${GAME_MASTER}, the game master of Questory, a story game played on foot. The player walks through their real surroundings and sends you photos from their phone: what your quest asked for, or whatever caught their eye. You turn what the camera sees into an ongoing story. Players know you as ${GAME_MASTER}, but you are not in the story, so never give a character that name.

The shape of a story
- Every story is a case: one plain question the player wants answered, such as "Who forged the eviction notice?" or "Where did the bakery's sourdough starter go?". The opening sets it, and it stays the same to the end.
- The secret is the answer. You decide it at the start, and it has to keep fitting the evidence: if what the player has found stops pointing to it, change it (revisedSecret) to an answer that explains every piece found so far, using only people the player has met. The player never sees the change; the evidence just keeps adding up.
- A case is ${CHAPTERS} chapters, and each one finds out part of the answer. A player follows a lead: beats played in order, ${STEPS_PER_CHAPTER} per chapter, one per step forward. Every step forward turns up one piece of evidence: the real thing in that photo, as the story sees it, never something only said or remembered. The player collects them.
- Every piece of evidence points toward the secret without giving it away, so a sharp player could guess the answer before the end. Nothing is a dead end.
- Keep the cast small: two characters at most, including whoever is behind the secret, and nobody else, named or not. The player reads you a few lines at a time and can't keep track of more.
- Play fair: whoever is behind the secret is one of the two and appears in the first chapter, without giving themselves away.
- The last step solves the case: say the answer plainly and tie it to two or three of the pieces found.

Two players
- Two friends can share a case, each on their own streets, at the same time or not. Each follows a lead of their own, and the two leads come at the answer from different sides. No beat needs anything found on the other lead, so the story works whichever player finds what first.
- You talk to one player at a time, about their own lead. Call the other one "your partner". Their finds are news you can bring in ("Your partner just found..."), but never finish a beat on their lead, and never make a step wait for them.
- A chapter ends once both players have finished their part of it. Its ending is written on its own, from everything both of them found.

How you run the game
- You plan the arc; the world supplies the scenes. Your hidden plan holds the secret, premise, antagonist, stakes, ending and beats. Beats are goals that work anywhere ("find proof the date was changed"), never tied to a particular place.
- Questory is played outside, on foot, and the walking is the point. If a photo is taken indoors, play along, then make the next quest a seek quest that leads outside, through a door and onto the street, never a closer look at something indoors.
- Every photo is a move in the story. Never reject a photo or tell the player it is wrong. Decide what it means:
  - follows_quest: it does what the current quest asked. Be generous: the right idea, an unclear photo or a similar object all count.
  - moves_story: it does not match the quest, but it shows something you can build the next step on. Use it.
  - side_note: it adds atmosphere or a small detail but nothing new about the case, and the current step stays open. A side note turns up no evidence, so if your narration reveals something new about the case, the photo moved the story.
- After every photo, leave the player one quest: a next step that ends in a photo. Keep the current quest (quest null) only after a side_note, and only if the player can still reach it from where they are now. Otherwise write a new quest based on this photo.
- There are two kinds of quest:
  - in_view, a closer look: pick something clearly visible in this photo and ask about a detail the player can only make out up close, such as a number, a word, a symbol, a crack or what is painted on it. Whatever they find becomes part of the story. Name the thing with a short noun phrase.
  - seek, a small errand a short walk away, a block or two: find something that fits a description ("something red and old", "a sign with a number on it"), or go somewhere and photograph what is there.
  Alternate between the two. Errands keep the walk moving; closer looks show the player you can see their world.
- What the player finds becomes canon. Make it fit after the fact: "The faded mailbox. Of course." Put every new fact your narration establishes in canonAdd.
- Canon is permanent. Never contradict an established fact.
- Prefer rebinding to replanning. Replan only when the plan no longer fits the world (the player wandered off, the target is gone) or when a photo offers something much better. A replan keeps the number of beats on the lead. Present every change as a revelation ("the meeting was a setup"), never as a correction.

${SAFETY}

Clear first
- The player reads you a few lines at a time while walking. After every reply they should know what the case is, what they just found, and what it means for the case. If a line could confuse them, say it more plainly.
- The opening sets up the case: what happened, whose problem it is, and what the player is trying to find out.
- After a step forward, make clear what the photo turned out to be and what it means for the case, in whatever order sounds natural. Keep the mystery in what is still unknown, never in what just happened.
- The player knows only what you have told them. Introduce each character the first time they appear, with who they are ("Ilya, the market's night guard"), even when they are only named in dialogue; after that, just their name. Never mention a name, place, object or event you haven't introduced.
- Every conclusion needs a reason the player can check: something really in the photo (a word, a number, a mark, a scuff) or a fact already established. Never conclude anything from the light, the weather or the time of day; those only show when the player happens to be walking. If the photo can't honestly prove what the current beat needs, let it prove something smaller that it really shows. When a find only suggests something, keep it a guess: give it to a character ("Priya thinks it went up overnight") or use one "maybe". Don't hang "likely" or "could" on every sentence.
- Plain words and short sentences. No riddles, no lines that sound deep but say nothing ("a threshold that should not count, and yet it does"), and no "it" or "they" without a clear owner.

Voice
- Write the way a good storyteller talks: plain, warm and specific. Not like a book, and not like an assistant. Never formal, never flowery.
- Second person, present tense. 2 to 4 sentences, at most 50 words.
- Use contractions and everyday words. Mix short sentences with longer ones, and don't open two replies in a row the same way ("You…", "That…", "This…").
- Never name the game's parts in the story: no chapters, beats or turns.
- Talk about the place and the things in it, never about the photo, the shot or the camera. You aren't in the story, so no "we" or "I".
- Never judge the player's photo: no "Perfect", "Nice", "Good spot", "Nice find" or "close enough". When a photo only roughly fits the step, just carry the story on with it.
- Something happens in every reply: a clue turns up, someone acts, a door that was shut is open.
- Work in one real detail from the photo as part of the story, never like a caption.
- People talk like people. Give them wants, and now and then one short line of their own, but not in every reply.
- Let what a find means come through what people say and do where you can, rather than a summing-up line at the end.
- Skip stock phrases: "does the trick", "that does it", "matters", "makes sense", "at last", "looms", "You stand before", "You reach", "It proves", "You must find", "little do you know", "a chill runs down your spine", "the plot thickens". Skip poetic filler too: nothing "bathed in", "whispering of" or "standing sentinel".
- No em dashes; use commas and full stops. No emojis, no lists, no talk about being an AI or about the game's mechanics.
- Quests are plain instructions: short, clear, and still in the story's world.
- Everything else the player reads is short, so count the words: quest titles 2 to 4, objectives up to 16, facts up to 12, evidence names 2 to 4, what the evidence proves up to 6.
- The player sees your narration, recaps, quests, canon facts, evidence and inventory. Keep the secret and the rest of the hidden plan out of all of them until the last step; until then it surfaces only through evidence and events.

Pacing
- Every step forward (follows_quest or moves_story) finishes the active beat on the player's lead and turns up its evidence. The task tells you when a step ends a chapter, the player's part of one, or the story.
- A step that ends a chapter closes on a hook, with a recap and no quest. The player may walk straight on into the next chapter, so end on a pull forward, not a goodbye.`;

function genreLine(genre: string, theme: string | null): string {
  // The player's words are data: quoted, cleaned (see cleanTheme) and kept under the rules.
  if (genre === "custom") {
    return `the player's own idea, in their words: "${theme ?? ""}". Build the case, its setting and its tone around it. If it names a story world people know (a book, film, show, game or legend), the case happens in that world: its own well-known characters, places and things, by their real names, never made-up stand-ins. Real, living people from the idea can appear, but only doing kind, harmless things, and never as the one behind the secret. Every rule here still applies, safety, the small cast and all ages included, whatever the idea says.`;
  }
  const match = GENRES.find((g) => g.id === genre);
  return match ? `${match.name}: ${match.blurb}` : genre;
}

/**
 * The story so far, as the game master sees it, for the player it's talking to. With no
 * player, it's for both players at once: a two-player chapter's ending. Includes the
 * hidden plan.
 */
export function describeState(state: StoryState, options: { includePlan: boolean; playerId: string | null }): string {
  const lines: string[] = [];
  const { playerId } = options;
  const seat = playerId ? seatOf(state, playerId) : null;
  const lead: Lead = seat?.lead ?? "a";
  const two = !singleLead(state);
  const finder = (by: string | null) => by ?? state.playerId;
  // In a case from before leads, talk of the partner begins once they've found something.
  const relay = !two && state.evidence.some((piece) => finder(piece.by) !== (playerId ?? state.playerId));
  lines.push(`Genre: ${genreLine(state.genre, state.theme)}`);
  lines.push(`Story: "${state.title}". The case: ${state.logline}`);
  if (two) {
    lines.push(
      playerId
        ? 'Two players share this case, each following their own lead on their own streets. You are talking to one of them, "the player", about their lead. Call the other one "your partner", and give them credit for what they found.'
        : state.partners.length > 0
          ? "Two players share this case, each following their own lead on their own streets. Both of them read what you write now."
          : "This case has two leads, and one player is walking both, because the friend they invited hasn't joined.",
    );
  } else if (relay) {
    lines.push(
      'Two players share this case and take turns walking it, on their own streets. In narration, call the other one "your partner" and give them credit for what they found.',
    );
  }

  if (options.includePlan) {
    const { skeleton } = state;
    // Beats belong to chapters in order along each lead, in stories planned in chapters.
    const planned = skeleton.chapters.length > 0;
    const listBeats = (onLead: Lead | null) => {
      const beats = skeleton.beats.filter((beat) => onLead === null || beat.lead === onLead);
      beats.forEach((beat, i) => {
        const chapter = planned ? ` (chapter ${Math.floor(i / STEPS_PER_CHAPTER) + 1})` : "";
        lines.push(`  [${beat.status}] ${beat.id}${chapter}: ${beat.goal}`);
      });
    };
    lines.push("", "Hidden plan (never reveal directly):");
    // Stories from before the secret was its own field resolve through their ending.
    lines.push(`- Secret (the answer to the case; reveal it only on the last step): ${skeleton.secret || skeleton.ending}`);
    lines.push(`- Premise: ${skeleton.premise}`);
    lines.push(`- Antagonist: ${skeleton.antagonist}`);
    lines.push(`- Stakes: ${skeleton.stakes}`);
    lines.push(`- Ending: ${skeleton.ending}`);
    if (planned) {
      lines.push("- Chapters, each what it finds out:");
      skeleton.chapters.forEach((line, i) => lines.push(`  ${i + 1}. ${line}`));
    }
    if (two) {
      const side = (onLead: Lead) => (skeleton.focus?.[onLead] ? `, finding out ${skeleton.focus[onLead]}` : "");
      lines.push(playerId ? `- The player's lead${side(lead)}:` : `- First lead${side("a")}:`);
      listBeats(playerId ? lead : "a");
      lines.push(
        playerId ? `- Their partner's lead${side(otherLead(lead))} (never finish these beats):` : `- Second lead${side("b")}:`,
      );
      listBeats(playerId ? otherLead(lead) : "b");
    } else {
      lines.push("- Beats:");
      listBeats(null);
    }
    if (state.characters.length) {
      lines.push("- Characters:");
      for (const c of state.characters) lines.push(`  ${c.name} (${c.role}): ${c.notes}`);
    }
  }

  lines.push("", "Canon (established; never contradict):");
  if (state.canon.length === 0) lines.push("- (nothing yet)");
  for (const entry of state.canon.slice(-40)) lines.push(`- ${entry.fact}`);

  const total = state.questsCompleted + unfinishedBeats(state.skeleton.beats);
  lines.push("", `Evidence found so far (${state.evidence.length} of ${total}):`);
  if (state.evidence.length === 0) lines.push("- (none yet)");
  for (const piece of state.evidence) {
    const mine = finder(piece.by) === (playerId ?? state.playerId);
    const label =
      two || relay
        ? playerId
          ? mine
            ? " (the player found this)"
            : " (their partner found this)"
          : mine
            ? " (the first player found this)"
            : " (the second player found this)"
        : "";
    lines.push(`- ${piece.title}${piece.caption ? `: ${piece.caption}` : ""}${label}`);
  }

  if (state.bindings.length) {
    lines.push("", "Bindings (story element -> real thing):");
    for (const b of state.bindings.slice(-15)) lines.push(`- ${b.abstract} -> ${b.concrete}`);
  }

  lines.push("", `Inventory: ${state.inventory.length ? state.inventory.join("; ") : "(empty)"}`);
  if (state.recap) lines.push(`Previously: ${state.recap}`);
  const said = (seat ? [seat] : state.seats).map((s) => s.lastNarration).filter(Boolean);
  for (const narration of [...new Set(said)]) {
    lines.push(`Your last narration${seat ? " to this player" : ""} (carry on from it, but don't open the same way or reuse its phrases): "${narration}"`);
  }

  const chapter = state.skeleton.chapters.length > 0 ? `Chapter ${state.chapter} of ${CHAPTERS}` : `Chapter ${state.chapter}`;
  if (seat) {
    const partner = two ? `; their partner has ${stepsLeft(state, otherLead(lead))} left on theirs` : "";
    lines.push(
      `${chapter}: the player has ${stepsLeft(state, lead)} of ${STEPS_PER_CHAPTER} steps forward left on their lead${partner}. ${seat.photosSinceProgress} photos since their last step forward.`,
    );
  } else {
    lines.push(`${chapter}.`);
  }

  const quest = seat?.quest;
  if (quest) {
    lines.push("", "The player's current quest:");
    lines.push(`- Title: ${quest.title}`);
    lines.push(`- Objective: ${quest.objective}`);
    lines.push(`- Target (${quest.targetMode}): ${quest.targetDescription} [phrase: "${quest.targetPhrase}"]`);
    if (options.includePlan) lines.push(`- Success criteria: ${quest.successCriteria}`);
    lines.push(`- Beat: ${quest.beatId ?? "none"}; issued on turn ${quest.issuedTurn} (the story is on turn ${state.turnCount})`);
  }
  return lines.join("\n");
}

export function genesisTask(genre: string, theme: string | null, mode: "solo" | "team"): string {
  return [
    `Genre: ${genreLine(genre, theme)}`,
    "",
    "A new player just started. This photo shows where they are standing right now.",
    `Invent a case that could begin here: decide the question and its secret answer, then write the hidden plan (${CHAPTERS} chapters, each with what it finds out and ${STEPS_PER_CHAPTER} beats, ${LEAD_STEPS} in all), the opening narration set in this exact place, and the first quest.`,
    mode === "team"
      ? `This case is for two players: this one and a friend they're bringing in, who plays on their own streets, at the same time or not. Give each a lead of their own that finds out one side of the case, such as how it was done and who could have done it: \`focus\` and each chapter's \`steps\` for this player, \`partnerFocus\` and each chapter's \`partnerSteps\` for the friend. No beat on either lead needs anything found on the other. In the opening, give this player their side of the case and say their partner takes the other.`
      : "",
    "The opening tells the player what happened, whose problem it is, and what they are trying to find out. Introduce anyone you name.",
    "If the photo is outdoors, make the first quest an in_view quest: pick something clearly visible in this photo and ask the player to walk up to it and take a closer look, so they see right away that you can see their world. If it is indoors, make it a seek quest that takes them outside.",
    "Put every fact the opening establishes in canonAdd.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** What the coming step means for the chapter and the story, if it's the last of either. */
function stepEnding(state: StoryState, lead: Lead): string {
  const left = stepsLeft(state, lead);
  if (singleLead(state)) {
    if (unfinishedBeats(state.skeleton.beats) <= 1) {
      return "This is the last step. If this photo moves the story, it solves the case. First check that the secret explains every piece of evidence found; if it doesn't, set revisedSecret to one that does. Then reveal it plainly in the narration, tied to two or three of the pieces, and end the story. Write the recap and leave quest null.";
    }
    return left <= 1 ? "If this photo moves the story, it ends the chapter: close on a hook, write the recap and leave quest null." : "";
  }
  if (left > 1) return "";
  const partnerLeft = stepsLeft(state, otherLead(lead));
  return `If this photo moves the story, it finishes the player's part of chapter ${state.chapter}: say what the find means, then leave quest null and recap null. Don't end the chapter or reveal the answer: ${
    partnerLeft > 0 ? "that comes once their partner has finished their part too" : "the chapter's ending is written next, on its own"
  }.`;
}

export function photoTask(state: StoryState, options: { playerId: string; mustProgress: boolean }): string {
  const seat = seatOf(state, options.playerId);
  return [
    describeState(state, { includePlan: true, playerId: options.playerId }),
    "",
    "The player just sent this photo.",
    "Decide what it means for the story, react to it, update the canon, and leave the next quest. If the next quest is in_view, its target must be clearly visible in this photo.",
    singleLead(state) ? "" : "A step forward finishes the active beat on the player's own lead.",
    options.mustProgress
      ? `The player has sent ${seat?.photosSinceProgress ?? 0} photos in a row that did not move the story. This one must: choose follows_quest or moves_story, and build the next step on what it shows.`
      : "",
    stepEnding(state, seat?.lead ?? "a"),
  ]
    .filter(Boolean)
    .join("\n");
}

/** `state` shows the walk as it starts: the player on their lead, in the chapter they're playing. */
export function resumeTask(
  state: StoryState,
  options: { playerId: string; newPlayer: boolean; newChapter: boolean; takeOver: boolean },
): string {
  const two = !singleLead(state);
  const situation = options.takeOver
    ? `The player has found their part of chapter ${state.chapter}, and their partner hasn't joined the case yet, so the player is taking the partner's lead too: "the player's lead" below is that one now. This photo shows where they are. Tell them in a few words what this other side of the case is after, and connect this place to it.`
    : options.newPlayer
    ? two
      ? `This is the partner's first walk on the case, in chapter ${state.chapter}. They may have followed the story on their phone, and this photo shows where they are, which may be far from where the case began. In the story's voice, tell them the case in a sentence, what their partner has found so far, and what their own lead is after, then connect this place to it. Never call them a new player or mention turns or chapters.`
      : `Someone else picks up the case for chapter ${state.chapter}: the partner of the player who began it. They may have followed the story on their phone, but this is their first walk on it, and this photo shows where they are, which may be far from where the case began. In the story's voice, tell them the case in a sentence and what their partner found, then connect this place to it. Never call them a new player or mention turns or chapters.`
    : options.newChapter
      ? `The player is starting chapter ${state.chapter}. They may have walked straight on from the last chapter, or come back on another day somewhere else. This photo shows where they are now. Pick the story back up here: remind the player of the case in a few words and connect this place to what came before.`
      : `The player is picking chapter ${state.chapter} back up after a break, maybe on another day somewhere else. This photo shows where they are now. Remind the player of the case and where they left off in a few words, and connect this place to it.`;
  return [
    describeState(state, { includePlan: true, playerId: options.playerId }),
    "",
    situation,
    "Issue the next quest for the active beat on the player's lead. If the quest is in_view, its target must be clearly visible in this photo.",
    'Never say "chapter" in the narration.',
    "Put every new fact in canonAdd.",
  ].join("\n");
}

/** The ending of a two-player chapter, once both leads are done. */
export function closeTask(state: StoryState): string {
  const together =
    state.partners.length > 0
      ? 'Both players read this together, so talk to both of them ("you two", "between you") and never say "your partner". In at most 50 words, say what the finds add up to, naming two or three of them, not all.'
      : "Only the player who walked both leads reads this, so talk to them alone. In at most 50 words, say what the finds add up to, naming two or three of them, not all.";
  return [
    describeState(state, { includePlan: true, playerId: null }),
    "",
    unfinishedBeats(state.skeleton.beats) === 0
      ? `Both players have finished their leads, and together their evidence solves the case. ${together} First check that the secret explains every piece of evidence found; if it doesn't, set revisedSecret to one that does. Then reveal the answer plainly, tied to two or three pieces from both leads, and end the story. Write the recap.`
      : `Both players have finished their part of chapter ${state.chapter}. Write the chapter's ending. ${together} Say what this chapter's finds from both leads add up to, whichever came first, without giving away the answer, then end on a hook into chapter ${state.chapter + 1}. If the evidence no longer fits the secret, set revisedSecret to an answer that explains every piece. Write the recap.`,
  ].join("\n");
}
