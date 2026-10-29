# Questory

A story game that gets you walking. Take a photo of wherever you are, and Wren, an AI game master, turns it into the start of a case. Each quest sends you somewhere nearby to photograph something real, and the story carries on across your walks.

**Play it at [questory.run](https://questory.run) on your phone.** On a computer, the site shows a code to scan with your phone.

Built on the Meta Model API for the Meta Global AI Developer Hackathon.

## Why walking

In 2022, 31% of adults worldwide didn't get enough physical activity, up from 26% in 2010 [1]. Games can help: engaged Pokémon GO players walked about 1,473 more steps a day in their first month [2], but the extra steps were gone by the sixth week [3].

Questory is built for the part where people stop. Every chapter ends on a hook, so there's a reason to go out again. A photo taken indoors still starts a story, but the first quest sends you outside. When a chapter ends, you see how long you walked, worked out from photo timestamps, so no GPS is needed.

1. Strain T, Flaxman S, Guthold R, et al. National, regional, and global trends in insufficient physical activity among adults from 2000 to 2022: a pooled analysis of 507 population-based surveys with 5.7 million participants. *Lancet Global Health* 2024;12:e1232-e1243. [doi:10.1016/S2214-109X(24)00150-5](https://doi.org/10.1016/S2214-109X%2824%2900150-5)
2. Althoff T, White RW, Horvitz E. Influence of Pokémon Go on physical activity: study and implications. *Journal of Medical Internet Research* 2016;18(12):e315. [jmir.org/2016/12/e315](https://www.jmir.org/2016/12/e315)
3. Howe KB, Suharlim C, Ueda P, Howe D, Kawachi I, Rimm EB. Gotta catch'em all! Pokémon GO and physical activity among young adults: difference in differences study. *BMJ* 2016;355:i6270. [doi:10.1136/bmj.i6270](https://doi.org/10.1136/bmj.i6270)

## How to play

1. **Start a case.** Pick Mystery, Fantasy, Sci-fi or Comedy, or type your own idea, like "a haunted bakery". Then take a photo of where you are, and Wren turns it into the opening of a case.
2. **Follow the quests.** A quest asks for a closer look at something in your photo, or sends you a block or two away to photograph something real. Any photo counts: it can follow the quest, take the story somewhere new, or add a side note.
3. **Collect the evidence.** Each step forward turns up a piece of evidence with its own picture. A case is three chapters of four steps, and the last step solves it.
4. **Come back for the next chapter.** Every chapter ends on a hook. Ending a walk only pauses the story, and your next photo picks it up wherever you are.

To play with a friend, pick "With a friend" and send them the link. You each follow your own lead on your own walk, at the same time or not, and a chapter ends once you've both finished your part.

## Built with

- **Meta Model API.** Muse Wonder plays Wren, Muse Spark checks Wren's words against the photo, SAM 3.1 outlines what a quest asks you to look at, and Muse Image draws the evidence.
- **Next.js 16 and React 19**, hosted on **Vercel**.
- **Appwrite** for stories, photos and evidence pictures.

## How it works

### A turn

1. The browser shrinks the photo to 1280px and uploads it.
2. Muse Wonder reads the photo and the story so far, decides what the photo means, writes a few lines and leaves the next quest, all as structured JSON.
3. When a photo turns up evidence, or starts a case or a walk, Muse Spark compares Wren's words with the photo and takes out anything described as there to see that isn't, like scratches on a lock that has none.
4. When the next quest is a closer look, SAM 3.1 finds its target in the photo, and the app traces the outline.
5. Muse Image redraws a photo that turns up evidence as an evidence card in the story's style, with its name and what it shows lettered on. If the picture is refused, it gets one plainer try, and after that the photo stands in.

### The case

- Every case has one question, like "Who took Sir Buttons the garden gnome?", and an answer Wren decides at the start.
- What you photograph stands in for something in the story: a numbered door becomes the store cupboard. Wren plans places and objects to find, and your photo decides how they look.
- Each quest goes where the last find pointed, so the finds make a trail.
- There are two characters at most, and whoever is behind it shows up early. The evidence narrows it down without naming them until the last chapter.
- If the evidence stops fitting the answer, Wren changes the answer to fit the evidence.
- Quests are suggestions. After two side notes in a row, the next photo moves the story, whatever it shows.
- Name a world people know, like Sherlock Holmes, and the case happens there.

### Two players

A shared case has two leads that come at the answer from different sides, such as how it was done and who could have done it.

- Nothing on your lead waits for your partner.
- Wren knows what you've both found and can bring your partner's latest find into your story.
- A chapter's ending is written from everything you both found, so it reads the same in any order.
- Two photos sent at once both count, because each turn is saved under a short per-story lock.
- If your friend hasn't joined by the time your part is done, you can walk theirs too.

### What Wren remembers

| Layer | What it holds | How it changes |
| --- | --- | --- |
| Skeleton | The hidden answer, what each chapter finds out, and each lead's steps | Re-planned only when the world forces it, and told as a twist |
| Bindings | Which real thing stands in for which story element ("the dead drop" is "the red mailbox") | Freely, every turn |
| Canon | Facts already established in play | Never contradicted |

The state is saved after every turn. The skeleton never reaches the browser, and the answer only does once the case is solved.

## Privacy

- **No account.** A random ID in a cookie ties stories to your browser.
- **No location.** The app never asks for GPS, and photos are redrawn in the browser, which drops the location data phones store in them.
- **Private photos.** They go to the Meta Model API and then to a private bucket, and they're served only through long random links.
- **Opt-in sharing.** An invite link shows only the case. A case has room for one friend, so a forwarded link doesn't let a third person in.
- **Real deletes.** Deleting a story removes its photos and cards too.
- **No stored addresses.** The per-player limit counts by IP address but keeps only a keyed hash that changes every day.

## Run it

```sh
npm install
cp .env.example .env.local   # add MODEL_API_KEY to use the real models
npm run dev
```

Open http://localhost:3000. Without `MODEL_API_KEY`, a scripted game master runs instead, so you can work on the UI for free. `GET /api/health` shows the mode and models.

To try it on a phone, open the Network address that `npm run dev` prints on your computer, and scan the code with a phone on the same Wi-Fi. Anyone on that network can reach it, so stop the server when you're done if a real key is set.

## Deploy

Locally, stories are saved as files in `.data/`. Serverless hosts need Appwrite:

1. Create an Appwrite project and an API key with every Database and Storage scope.
2. Set `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`.
3. Run `npm run setup:appwrite`. It creates the database, tables and a private bucket, and when run again it only adds what's missing.

On Vercel, import the repo, add `MODEL_API_KEY` and the three Appwrite values, and deploy. `/api/health` should then show `"mode":"live"` and `"storage":"appwrite"`. A page left open across a deploy reloads itself once nothing is in flight.

Before you share the link:

- **Anyone who can open the site spends your Meta credit.** `DAILY_CALL_LIMIT` caps what a day can cost, and `PLAYER_DAILY_CALL_LIMIT` caps one player.
- **Free Appwrite projects pause after 7 days without Console activity**, and a paused project can't load or save stories. Open the Console every few days, and reactivate the project there if it pauses.

## Configuration

Every setting is an environment variable, documented in `.env.example`. The main ones:

| Variable | Default | What it does |
| --- | --- | --- |
| `GM_REASONING_EFFORT` | `minimal` | Muse Wonder's effort. `medium` took twice as long in testing and wrote no better |
| `QUEST_CARDS` | `on` | Turn off to skip Muse Image |
| `SAM_GROUNDING` | `on` | Turn off to skip target outlines |
| `PHOTO_CHECK` | `on` | Turn off to skip the photo check, which adds a few seconds to steps that turn up evidence |
| `CHECK_MODEL` | `muse-spark-1.3` | The model for the photo check |
| `DAILY_CALL_LIMIT` | `200` | Paid calls per UTC day across all players. `0` turns it off |
| `PLAYER_DAILY_CALL_LIMIT` | `100` | Paid calls per UTC day for one player, about three cases. `0` turns it off |

## Cost

A photo turn costs roughly 3 to 5 cents on Muse Wonder, and an evidence card 1 cent more. Steps that turn up evidence also make one Muse Spark call for the photo check. Every call logs its token use to the server console, and the default daily limit keeps a bad day to about $10.

## Project layout

```
app/page.tsx  The landing page, with a code to scan on a computer
app/play/     The game
app/api/      Route handlers: stories, turns, evidence cards, media, health
components/   The mobile UI
lib/gm/       The game master: state, prompts, output schemas, engine, scripted mock
lib/meta/     Meta Model API clients: structured JSON, SAM 3.1, Muse Image
lib/store/    Storage: local files or Appwrite
scripts/      Appwrite setup
```

## Credits

Fonts: Barlow and Literata, both under the SIL Open Font License (see `app/fonts/`).
