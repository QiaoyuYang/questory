<div align="center">

# Questory

**Turn photos of your street into a story.**

Wren, an AI game master, builds a case from what you photograph.

[Play at questory.run](https://questory.run) · [How it works](#how-it-works) · [Run it locally](#run-it-locally)

<p>
  <img src="public/landing/opening.webp" width="240" alt="A photo of a bakery on a street corner, with the opening of a case below it">
  <img src="public/landing/evidence.webp" width="240" alt="The photo redrawn as an evidence card called The waiting bench">
  <img src="public/landing/case.webp" width="240" alt="The case so far: two pieces of evidence found, and ten more to find">
</p>

</div>

Questory is a web game made for phones. Open [questory.run](https://questory.run) on your phone, or scan the code it shows on a computer. It was built on the Meta Model API for the Meta Global AI Developer Hackathon.

## Why walking

In 2022, 31% of adults worldwide did not get enough physical activity [1]. Pokémon GO showed that a game can get people walking [2], but the extra steps were gone within six weeks [3]. Questory is built to keep people coming back. A case runs over several walks, and each chapter ends on a hook that gives you a reason to go out again.

## How to play

1. Pick a genre (Mystery, Fantasy, Sci-fi or Comedy) or type your own idea, such as "a haunted bakery".
2. Take a photo of where you are, even indoors. Wren writes the opening of the case around it and then leads you outside.
3. Follow the quests. A quest asks for a closer look at something in your last photo, or sends you a block or two away to find something real. When a photo turns up something new, it becomes a piece of evidence with its own picture.
4. Collect evidence until it points to the answer. A case has three chapters. Each one ends on a hook and shows how long you walked. You can stop at any time, and your next photo picks the story up wherever you are.

To play with a friend, choose "With a friend" and send them the link. You each follow your own lead on your own walk, at the same time or not, and a chapter ends once you have both finished your part.

## How it works

Questory is a Next.js 16 app hosted on Vercel, with stories and images stored in Appwrite. It uses four models from the Meta Model API:

| Model | Used for |
| :--- | :--- |
| Muse Wonder | Playing Wren: reading each photo and writing the story and quests |
| Muse Spark | Checking Wren's lines against the photo |
| SAM 3.1 | Outlining what a closer-look quest points at |
| Muse Image | Redrawing photos that turn up evidence as evidence cards |

### A turn

1. The phone resizes the photo to 1280 px, re-encodes it as JPEG and uploads it.
2. Muse Wonder reads the photo with the story so far. In one structured JSON reply, it decides what the photo means, writes a few lines and leaves the next quest. A photo can answer the current quest, take the story somewhere new, or be a side note that leaves the quest open.
3. Unless the photo was a side note, Muse Spark compares Wren's lines with the photo and removes anything described as visible that isn't there. At the same time, if the next quest is a closer look, SAM 3.1 finds its target in the photo.
4. The turn is saved and sent back. If it turned up evidence, the phone then asks for the card, which Muse Image paints. A refused picture gets one retry with a plainer prompt, and after that the photo itself is used.

### The case

Every case has one question, such as "Who took Sir Buttons the garden gnome?", and a hidden answer that Wren decides at the start. Wren plans each chapter as places and objects to find, and each quest goes where the last find pointed, so the evidence forms a trail. There are two characters at most, and whoever is behind it appears in the first chapter, though the answer only comes out in the last. If the evidence stops pointing to the answer, Wren changes the answer to fit everything found so far.

Each photo becomes something it could reasonably be in the story, so a numbered door might become the store cupboard. The plan says what to find, and your photo decides how it looks. Any photo counts, even one that ignores the quest, and after two side notes in a row the next photo moves the story whatever it shows. A custom idea set in a well-known story world, such as Sherlock Holmes, plays out in that world with its own characters.

### What Wren remembers

Wren keeps three kinds of memory, saved after every turn:

| Layer | What it holds | How it changes |
| :--- | :--- | :--- |
| Skeleton | The hidden plan: the answer, what each chapter finds out, and the steps on each lead | Only when the world forces it, and then told as a twist |
| Bindings | Which real thing is which story element ("the dead drop" is "the red mailbox") | Freely, every turn |
| Canon | Facts already established in play | Never contradicted |

The skeleton never reaches the browser, and the answer is only sent once the case is solved.

### Two players

A shared case has two leads that come at the answer from different sides, such as how it was done and who could have done it. Each player follows one lead without waiting for the other. Wren sees what both have found and mentions a partner's find when it changes what yours means. A chapter's ending is written from everything both players found. Turns are saved under a short per-story lock, so two photos sent at once both count. If your friend hasn't joined by the time your part is done, you can play their lead too.

## Privacy

- There is no account. A random ID in a cookie links your stories to your browser.
- The app never asks for your location. Photos are re-encoded on the phone before upload, which removes their location data, and walk times come from when photos were sent.
- Photos go to the Meta Model API and then to a private storage bucket, and are only served through long random links.
- An invite link shows only its own case, and a case has room for one friend, so a forwarded link can't let a third person in.
- Deleting a story also deletes its photos and evidence cards.
- The per-player limit counts calls by IP address but stores only a keyed hash that changes every day.

## Run it locally

You need Node.js 20.17 or later.

```sh
npm install
cp .env.example .env.local   # add MODEL_API_KEY to use the real models
npm run dev
```

Open http://localhost:3000. Without `MODEL_API_KEY`, the app uses a scripted game master, so you can work on the interface without spending credit. `GET /api/health` shows which mode and models are in use.

To try it on a phone on the same Wi-Fi, open the Network address that `npm run dev` prints and scan the code it shows. Anyone on that network can reach the server, so stop it when you're done if a real key is set.

Run the unit tests with `npm test`.

## Deploy

Locally, stories are saved as files in `.data/`. A serverless host needs Appwrite:

1. Create an Appwrite project and an API key with all Database and Storage scopes.
2. Set `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`.
3. Run `npm run setup:appwrite` to create the database, tables and a private bucket. Running it again only adds what's missing.

On Vercel, import the repository, add `MODEL_API_KEY` and the three Appwrite variables, and deploy. `/api/health` should then show `"mode":"live"` and `"storage":"appwrite"`.

Before you share the link:

- Anyone who can open the site spends your Meta credit. The daily limits below cap what a day can cost.
- Free Appwrite projects pause after 7 days without Console activity, and a paused project can't load or save stories. Open the Console every few days, and reactivate the project there if it pauses.

## Configuration

Settings are environment variables, all documented in [`.env.example`](.env.example). The main ones:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `GM_REASONING_EFFORT` | `minimal` | Muse Wonder's reasoning effort. In testing, `medium` took twice as long and wrote no better. |
| `QUEST_CARDS` | `on` | Set to `off` to skip Muse Image evidence cards. |
| `SAM_GROUNDING` | `on` | Set to `off` to skip target outlines. |
| `PHOTO_CHECK` | `on` | Set to `off` to skip the photo check, which adds a few seconds to steps that turn up evidence. |
| `DAILY_CALL_LIMIT` | `200` | Paid calls per UTC day across all players. `0` turns it off. |
| `PLAYER_DAILY_CALL_LIMIT` | `100` | Paid calls per UTC day for one player, about three cases. `0` turns it off. |

A photo turn costs about 3 to 5 cents on Muse Wonder, plus 1 cent when Muse Image paints an evidence card. Steps that turn up evidence also make one Muse Spark call for the photo check. Every call logs its token use to the server console, and the default daily limit keeps a day's cost to about $10.

## Project structure

```
app/page.tsx   Landing page, with a code to scan on a computer
app/play/      The game
app/api/       Route handlers for stories, turns, evidence cards, media and health
components/    The mobile interface
lib/gm/        The game master: state, prompts, output schemas, engine and a scripted mock
lib/meta/      Meta Model API clients for structured JSON, SAM 3.1 and Muse Image
lib/store/     Storage in local files or Appwrite
lib/client/    Browser code for photos, API calls and invite links
scripts/       Appwrite setup
```

## License

Questory is released under the [MIT License](LICENSE). The Barlow and Literata fonts are under the SIL Open Font License (see `app/fonts/`).

## References

1. Strain T, Flaxman S, Guthold R, et al. National, regional, and global trends in insufficient physical activity among adults from 2000 to 2022: a pooled analysis of 507 population-based surveys with 5.7 million participants. *Lancet Global Health* 2024;12:e1232-e1243. [doi:10.1016/S2214-109X(24)00150-5](https://doi.org/10.1016/S2214-109X%2824%2900150-5)
2. Althoff T, White RW, Horvitz E. Influence of Pokémon Go on physical activity: study and implications. *Journal of Medical Internet Research* 2016;18(12):e315. [jmir.org/2016/12/e315](https://www.jmir.org/2016/12/e315)
3. Howe KB, Suharlim C, Ueda P, Howe D, Kawachi I, Rimm EB. Gotta catch'em all! Pokémon GO and physical activity among young adults: difference in differences study. *BMJ* 2016;355:i6270. [doi:10.1136/bmj.i6270](https://doi.org/10.1136/bmj.i6270)
