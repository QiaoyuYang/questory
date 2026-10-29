import "server-only";
import { GAME_MASTER, GENRES } from "@/lib/types";
import { openBeats, unfinishedBeats, type Lead } from "./beats";
import type { CheckIn } from "./outputs";
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
- Every story is a case: one question the player wants answered, such as "Who forged the eviction notice?" or "Where did the bakery's sourdough starter go?". The opening sets it, and it stays the same to the end.
- The secret is the answer. You decide it at the start, and it has to keep fitting the evidence: if what the player has found stops pointing to it, change it (revisedSecret) to an answer that explains every piece found so far, using only people the player has met. The player never sees the change; the evidence just keeps adding up.
- A case is ${CHAPTERS} chapters, and each one finds out part of the answer. A player follows a lead: beats played in order, ${STEPS_PER_CHAPTER} per chapter, one per step forward. Every step forward turns up one piece of evidence, and the player collects them.
- Evidence is a place or object you could really find in the story's world: the noticeboard the fake notice went up on, the cupboard where the spare key hangs, the bin where the wrapper ended up. Each piece tells the player one thing they didn't know about how it was done, who did it, why, or where the missing thing is now. Never spend a step on what they already know.
- The finds on a lead make one trail: each turns up where the last one pointed (the bus stop leads to the alley, and the alley to the shed where it was hidden). Every piece points toward the secret without giving it away, so a sharp player could guess the answer before the end. Nothing is a dead end.
- Keep the cast small: two characters at most, including whoever is behind the secret, and nobody else, named or not. The player reads you a few lines at a time and can't keep track of more.
- Play fair: whoever is behind the secret is one of the two and appears in the first chapter, without giving themselves away. Until the last chapter, evidence narrows down who did it by what they have or did (a green scarf, a spare key, a free hour), never by name, so the answer stays a guess.
- The last step solves the case: say the answer outright and tie it to two of the pieces found.

Two players
- Two friends can share a case, each on their own streets, at the same time or not. Each follows a lead of their own, and the two leads come at the answer from different sides. No beat needs anything found on the other lead, so the story works whichever player finds what first.
- You talk to one player at a time, about their own lead. Call the other one "your partner". Bring up a partner's find only when it changes what this one means, and then in a few words ("Your partner found the forged signature"). Never finish a beat on their lead, and never make a step wait for them.
- A chapter ends once both players have finished their part of it. Its ending is written on its own, from everything both of them found.

How a photo becomes part of the story
- The player's surroundings stand in for the story's world. Whatever they photograph becomes a place or thing in the story that it could reasonably be: a numbered door becomes the witness's flat, a bench the spot where the courier waited, a drain cover the place the coins went down. The evidence is that real thing as the story sees it.
- So ask for real things that can be the next find: to find where the courier waited, send the player to a bench; to find where the note was posted, send them to a postbox.
- Keep that link believable. Build on what the thing obviously is, or on a detail it really has, such as a number, a word or a color. Never read the case into the shape, size or position of ordinary things (a painted line doesn't show how fast someone moved, and a crack in the paving can't hide a key), or into the light, the weather or the time of day.
- Never put something in plain view that the photo doesn't show. What's behind a door or inside a box is fair game.
- If a photo can't reasonably be the next find, let it be something smaller that it can be, or make it a side note: a moment in the story with nothing new about the case, which leaves the quest standing. Never tell the player a photo isn't what you wanted, that nothing is here, or that the find is still ahead. "Nina used to sit on this step after closing. She says the street was never this quiet." is a side note; "Nothing here shows where the jar went, so the flour trail is still waiting." is not.

How you run the game
- You plan the arc; the world supplies the scenes. Your hidden plan holds the secret, premise, antagonist, stakes, ending and beats. Each beat is the next find on its lead: a place or object in the story's world that ordinary real things can stand in for, and what finding it tells the player ("the cupboard the spare key came from", "the shop doorway where the swap happened"). How it looks comes from the player's photo when they find it, so a beat never says how it looks. Never tie a beat to a particular real place, and never write it as "find proof that...".
- Questory is played outside, on foot, and the walking is the point. If a photo is taken indoors, play along, then make the next quest a seek quest that leads outside, through a door and onto the street, never a closer look at something indoors.
- Every photo is a move in the story. Never reject a photo or tell the player it is wrong. Decide what it means:
  - follows_quest: it does what the current quest asked. Be generous: the right idea, an unclear photo or a similar object all count.
  - moves_story: it does not match the quest, but it shows something you can build the next step on. Use it.
  - side_note: it adds atmosphere or a small detail but nothing new about the case, and the current step stays open. A side note turns up no evidence, so if your narration reveals something new about the case, the photo moved the story.
- After every photo, leave the player one quest: a next step that ends in a photo. Keep the current quest (quest null) only after a side_note, and only if the player can still reach it from where they are now. Otherwise write a new one.
- Each quest goes where the last find pointed. Its title says what the player is looking for in the story ("The bus stop bench", "Where the bag went"), and its objective says what real thing to find and photograph ("Find a bench or a bus stop nearby and photograph it.").
- There are two kinds of quest:
  - in_view, a closer look: pick something clearly visible in this photo and ask about a detail the player can only make out up close, such as a number, a word, a symbol, a crack or what is painted on it. Whatever they find becomes part of the story. Name the thing with a short noun phrase.
  - seek, a small errand a short walk away, a block or two: find something that can be the next find ("a bench by a bus stop", "a door with a number on it"), or go somewhere and photograph what is there.
  Choose a closer look when something in this photo can be the next find, and an errand otherwise, so over a walk the two mix. Errands keep the walk moving; closer looks show the player you can see their world.
- What the player finds becomes canon. Make it fit after the fact: "The faded mailbox. Of course." Put every new fact your narration establishes in canonAdd.
- Canon is permanent. Never contradict an established fact.
- Prefer rebinding to replanning. Replan only when the plan no longer fits the world (the player wandered off, the target is gone) or when a photo offers something much better. A replan keeps the number of beats on the lead. Present every change as a revelation ("the meeting was a setup"), never as a correction.

${SAFETY}

Clear first
- The player reads you a few lines at a time while walking. After every reply they should know what the case is, what they just found, and what it tells them. If a line could confuse them, say it more simply. Keep the mystery in what is still unknown, never in what just happened.
- The opening sets up the case: what happened, who wants it solved, and what to find out.
- The player knows only what you have told them. Introduce each character the first time they appear, with who they are ("Ilya, the market's night guard", "the night guard, Ilya", "Ilya, who guards the market at night"), even when they are only named in dialogue. Someone everyone knows from a famous story needs no introduction. After that, just their name. Never mention a name, place, object or event you haven't introduced.
- When a find only suggests something, say it once as a guess ("might have", "probably"). Don't hang "likely" or "could" on every sentence.
- Everyday words and short sentences. No riddles, no lines that sound deep but say nothing ("a threshold that should not count, and yet it does"), and no "it" or "they" without a clear owner.

Voice
- Write the way a good storyteller talks to a friend: warm, specific and easy to follow. Not like a book, not like a report, and not like an assistant.
- Write whole sentences in the order people say them: who or what first, then what happens. Put "of", "on" or "in" between nouns instead of stacking them ("the lock on the cupboard").
- Second person, present tense. 2 or 3 sentences, at most 40 words, unless the reply's description gives you more room.
- Every sentence tells the player something new. Never repeat what they know already: what the opening or an earlier reply said, or what is obviously in their own photo. They took it, so don't describe it back to them; say what it is in the story.
- Say what the find tells them once, in everyday words, and stop. Never close on a line that sums it up again ("The swap had a hiding spot ready.").
- Stay with this find. Bring up an earlier one only when this one changes what it means, and then by its name in the story ("the spare key"), never by the real thing it was ("the grey box").
- Write like a person, which means none of these:
  - contrasts with something nobody suggested: "lifted, not spilled", "clear, not gold", "not a break-in at all"
  - a colon that sets up a point: "and the question is plain: who took it?"
  - lists of three: "hidden, carried in and swapped fast"
  - filler actions: someone nods, crouches, frowns, stares or looks from one thing to another
  - announcing the next step ("the cork is the next thing to check"); the quest does that
  - stock phrases: "does the trick", "that does it", "matters", "makes sense", "at last", "looms", "You stand before", "You reach", "It proves", "You must find", "little do you know", "a chill runs down your spine", "the plot thickens", and anything "bathed in", "whispering of" or "standing sentinel"
- Use contractions and everyday words. Mix short sentences with longer ones, and don't open two replies in a row the same way ("You…", "That…", "This…").
- Something happens in every reply: a clue turns up, someone acts, a door that was shut is open.
- The player does the finding. A character turns up only to do or say something new: give them wants, and now and then one short line of their own, but not in every reply, and never have them find things for the player.
- Never name the game's parts in the story: no chapters, beats or turns.
- Talk about the place and the things in it, never about the photo, the shot or the camera. You aren't in the story, so no "we" or "I".
- Never judge the player's photo: no "Perfect", "Nice", "Good spot", "Nice find" or "close enough". When a photo only roughly fits the step, just carry the story on with it.
- No em dashes; use commas and full stops. No emojis, no lists, no talk about being an AI or about the game's mechanics.
- Quests are instructions: short, clear, and still in the story's world.
- Everything else the player reads is short, so count the words: quest titles 2 to 4, objectives up to 16, facts up to 12, evidence names 2 to 4, what the evidence shows up to 6.
- The player sees your narration, recaps, quests, canon facts, evidence and inventory. Keep the secret and the rest of the hidden plan out of all of them until the last step; until then it surfaces only through evidence and events.

The difference, in a step from another case. The quest asked for the way the thief got out, and the photo shows a side gate with its bolt drawn back.
- Machine-made: "Beside the wall stands the grey side gate, its bolt drawn, not forced at all. Nina crouches. 'Someone came this way.' The jar left by the side, and fast."
- Human: "Someone has pulled back the bolt on the side gate. The jar went out this way while Nina was busy at the counter."

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
    lines.push(`Your last narration${seat ? " to this player" : ""} (follow on from it without repeating it: don't open the same way, restate what it said or reuse its phrases): "${narration}"`);
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

/**
 * Ways to open a case. Left to itself, every opening comes out the same: "This hall is…",
 * "Name, the role, found…", "You're trying to find out…". Each case gets one at random.
 */
export const OPENING_STYLES = [
  "Start with someone here, in the middle of an ordinary moment, then say what went wrong. Let who they are show in what they're doing. End on the question itself.",
  "Start with one short line someone says, then what happened. Give their job before their name. End on what they ask the player to do.",
  "Start with what went missing and when, then who wants it solved. Introduce them by what they do here. End on the deadline.",
  "Start with what goes wrong if nobody solves this, then what happened. End on what someone wants the player to find out.",
];

export function genesisTask(
  genre: string,
  theme: string | null,
  mode: "solo" | "team",
  style = OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)],
): string {
  return [
    `Genre: ${genreLine(genre, theme)}`,
    "",
    "A new player just started. This photo shows where they are standing right now.",
    `Invent a case that could begin here: decide the question and its secret answer, then write the hidden plan (${CHAPTERS} chapters, each with what it finds out and ${STEPS_PER_CHAPTER} beats, ${LEAD_STEPS} in all), the opening narration set in this exact place, and the first quest.`,
    "Every chapter finds out something the opening doesn't tell. Every beat is a new find on its lead's trail, picking up where the one before it pointed, and no two beats find the same thing. The first beat starts where the opening leaves off, so it is never the thing the opening is about. Before the last chapter, no beat names whoever is behind the secret.",
    mode === "team"
      ? `This case is for two players: this one and a friend they're bringing in, who plays on their own streets, at the same time or not. Give each a lead of their own that finds out one side of the case, such as how it was done and who could have done it: \`focus\` and each chapter's \`steps\` for this player, \`partnerFocus\` and each chapter's \`partnerSteps\` for the friend. No beat on either lead needs anything found on the other. In the opening, tell this player in a few words which side is theirs and that their partner has the other, the way a friend would put it ("You'll work out how the notice got under the door, and your partner will find out who wanted it there.").`
      : "",
    `The opening, at most 50 words, tells the player what happened, who wants it solved, and what to find out. ${style} Everything else can wait for later steps. Introduce anyone you name, unless everyone knows them from a famous story.`,
    "The first quest is for the first beat on this player's lead: ask for a real thing that can be that find. If the photo is outdoors and something in it could be that find, make it a closer look (in_view), so they see right away that you can see their world; otherwise make it an errand (seek). If the photo is indoors, make it an errand that takes them outside.",
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
      return "This is the last step. If this photo moves the story, it solves the case. First check that the secret explains every piece of evidence found; if it doesn't, set revisedSecret to one that does. Then say it outright in the narration, tied to two of the pieces, and end the story. Write the recap and leave quest null.";
    }
    return left <= 1 ? "If this photo moves the story, it ends the chapter: close on a hook, write the recap and leave quest null." : "";
  }
  if (left > 1) return "";
  const partnerLeft = stepsLeft(state, otherLead(lead));
  return `If this photo moves the story, it finishes the player's part of chapter ${state.chapter}: say what the find means without summing up their part, then leave quest null and recap null. Don't end the chapter or reveal the answer: ${
    partnerLeft > 0 ? "that comes once their partner has finished their part too" : "the chapter's ending is written next, on its own"
  }.`;
}

/** Which beat the next quest is for, so it sends the player after a real thing that can be that find. */
function questTarget(state: StoryState, lead: Lead): string {
  const [active, next] = openBeats(state.skeleton.beats, lead);
  if (!active) return "";
  const ask = "ask for a real thing that can be that find";
  const afterSideNote = `After a side note, any new quest is for ${active.id}, "${active.goal}": ${ask}.`;
  return next && stepsLeft(state, lead) > 1
    ? `If this photo moves the story, the next quest is for ${next.id}, "${next.goal}": ${ask}. ${afterSideNote}`
    : afterSideNote;
}

export function photoTask(state: StoryState, options: { playerId: string; mustProgress: boolean }): string {
  const seat = seatOf(state, options.playerId);
  const lead = seat?.lead ?? "a";
  return [
    describeState(state, { includePlan: true, playerId: options.playerId }),
    "",
    "The player just sent this photo.",
    "Decide what it is in the story and what it tells the player, update the canon, and leave the next quest. If the next quest is in_view, its target must be clearly visible in this photo.",
    singleLead(state) ? "" : "A step forward finishes the active beat on the player's own lead.",
    questTarget(state, lead),
    options.mustProgress
      ? `The player has sent ${seat?.photosSinceProgress ?? 0} photos in a row that did not move the story. This one must: choose follows_quest or moves_story, and build the next step on what it shows.`
      : "",
    stepEnding(state, lead),
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
  const [active] = openBeats(state.skeleton.beats, seatOf(state, options.playerId)?.lead ?? "a");
  const partnerFound = state.evidence.some((piece) => (piece.by ?? state.playerId) !== options.playerId);
  const situation = options.takeOver
    ? `The player has found their part of chapter ${state.chapter}, and their partner hasn't joined the case yet, so the player is taking the partner's lead too: "the player's lead" below is that one now. This photo shows where they are. Tell them in a few words what this other side of the case is after, and what this place is in it.`
    : options.newPlayer
    ? two
      ? `This is the partner's first walk on the case, in chapter ${state.chapter}. They may have followed the story on their phone, and this photo shows where they are, which may be far from where the case began. In the story's voice and at most 50 words, tell them the case and what their own lead is after, then what this place is in the story.${partnerFound ? " Bring in their partner's best find so far in a few words." : ""} Never call them a new player or mention turns or chapters.`
      : `Someone else picks up the case for chapter ${state.chapter}: the partner of the player who began it. They may have followed the story on their phone, but this is their first walk on it, and this photo shows where they are, which may be far from where the case began. In the story's voice, tell them the case in a sentence and what their partner found, then what this place is in the story. Never call them a new player or mention turns or chapters.`
    : options.newChapter
      ? `The player is starting chapter ${state.chapter}. They may have walked straight on from the last chapter, or come back on another day somewhere else. This photo shows where they are now. Pick the story back up here: remind the player of the case in a few words, and make this place where the trail goes next.`
      : `The player is picking chapter ${state.chapter} back up after a break, maybe on another day somewhere else. This photo shows where they are now. Remind the player of the case and where they left off in a few words, and make this place where the trail goes next.`;
  return [
    describeState(state, { includePlan: true, playerId: options.playerId }),
    "",
    situation,
    `Issue the next quest for the active beat on the player's lead${active ? `, ${active.id}, "${active.goal}": ask for a real thing that can be that find` : ""}. If the quest is in_view, its target must be clearly visible in this photo.`,
    'Never say "chapter" in the narration.',
    "Put every new fact in canonAdd.",
  ].join("\n");
}

/** The ending of a two-player chapter, once both leads are done. */
export function closeTask(state: StoryState): string {
  const together =
    state.partners.length > 0
      ? 'Both players read this together, so talk to both of them ("you two", "between you") and never say "your partner". In at most 50 words, tell them what the finds add up to, the way a friend would sum up a case so far, bringing in one or two of them by name rather than listing them.'
      : "Only the player who walked both leads reads this, so talk to them alone. In at most 50 words, tell them what the finds add up to, the way a friend would sum up a case so far, bringing in one or two of them by name rather than listing them.";
  return [
    describeState(state, { includePlan: true, playerId: null }),
    "",
    unfinishedBeats(state.skeleton.beats) === 0
      ? `Both players have finished their leads, and together their evidence solves the case. ${together} First check that the secret explains every piece of evidence found; if it doesn't, set revisedSecret to one that does. Then say the answer outright, tied to a piece from each lead, and end the story. Write the recap.`
      : `Both players have finished their part of chapter ${state.chapter}. Write the chapter's ending. ${together} Say what this chapter's finds from both leads add up to, whichever came first, without giving away the answer, then end on a hook into chapter ${state.chapter + 1}. If the evidence no longer fits the secret, set revisedSecret to an answer that explains every piece. Write the recap.`,
    'Never say "chapter" in the narration or the recap.',
  ].join("\n");
}

/** The photo check's own instructions: it reads the text and the photo, nothing of the case. */
export const CHECK_INSTRUCTIONS = `You check a storyteller's text against a photo, for Questory, a story game played on foot. The player photographed a real place, and the story treats that place as part of its own world.

These are fine, leave them alone:
- what the place or thing is in the story ("this postbox is the hall's noticeboard", "the blue door is the bell cupboard")
- what a sign or notice in the photo says in the story
- what is behind a door, inside a box or somewhere out of sight
- what someone says, remembers, thinks or feels
- what happened before, and what a find means

Take out anything the text describes as there to see, right here, that this photo doesn't show: an object that isn't in it, a mark, scratch, pin, track, stain or tear that isn't there, or a state you can't see (open, locked, freshly painted).

List each of those in madeUp, quoting the text. Then give back the narration, card and facts with only those taken out, so nothing claims to be in view that isn't. Change as few words as you can and keep the voice. Every sentence you touch must still read naturally, and if another sentence leans on what you took out, rework it too, so the whole text still makes sense. Keep what the find means where you can, said plainly or by a character who already speaks in the text, and never start two sentences with the same name. Always give the card back when the text has one: fix its words, and keep its proves a short statement of what the find shows, 3 to 6 words. Keep every fact that states nothing made up. When nothing is made up, give everything back word for word.`;

export function checkTask(text: CheckIn): string {
  return `The text:\n${JSON.stringify(text, null, 1)}`;
}
