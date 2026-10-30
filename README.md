<div align="center">

# Questory

**Turn photos of your street into a story.**

Wren, an AI agent, builds a case from what you photograph. Every case is solved on foot.

Play at [questory.run](https://questory.run)

<p>
  <img src="public/landing/opening.webp" width="240" alt="A photo of a bakery on a street corner, with the opening of a case below it">
  <img src="public/landing/evidence.webp" width="240" alt="The photo redrawn as an evidence card called The waiting bench">
  <img src="public/landing/case.webp" width="240" alt="The case so far: two pieces of evidence found, and ten more to find">
</p>

</div>

Questory is made for phones. Open [questory.run](https://questory.run) on your phone, or scan the code it shows on a computer. It was built on the Meta Model API for the Meta Global AI Developer Hackathon.

## How to play

A case is a question with a hidden answer, like where a bakery's sourdough starter went. You solve it by photographing what Wren asks for.

1. Pick a theme for the story.
2. Take a photo of where you are. Wren writes the opening of the case around it, then leads you outside if you aren't already.
3. Follow the quests to find evidence. A quest asks for a closer look at something in your last photo, or sends you a block or two away to find something. A photo that moves the case forward becomes a piece of evidence.
4. Collect evidence until it points to the answer. A case has multiple chapters, and finishing one ends your walk. You can stop at any time, and your next photo picks the story up wherever you are.

To play with a friend, choose "With a friend" and send them the link. The case gets two leads, one for each of you: two trails of evidence that end at the same answer. You each follow yours on your own walk, at the same time or not, and a chapter ends once you have both finished your part.

## How it works

Wren is an AI agent. It plans each case, reads every photo with what it remembers of the story, decides what happens next and changes its plan when your photos stop fitting it. Wren can't walk, so you do, and its quests say where to look. It has three subagents, each with one job.

Questory is a Next.js 16 app that uses four models from the Meta Model API:

| Model | Role | Used for |
| :--- | :--- | :--- |
| Muse Wonder | Agent | Wren itself: planning the case, reading each photo and writing the story and quests |
| Muse Spark | Subagent | Checking Wren's lines against the photo |
| SAM 3.1 | Subagent | Outlining what a closer-look quest points at |
| Muse Image | Subagent | Redrawing photos that turn up evidence as evidence cards |

### A turn

A turn is one photo and everything Wren does with it.

<img src="docs/turn.png" alt="One turn: your photo goes to Muse Wonder, then to Muse Spark and SAM 3.1 at the same time, then into the story memory, and Muse Image paints any evidence. Wren reads the memory again on the next photo.">

1. You take a photo. The phone resizes it to 1280 px, re-encodes it as JPEG and uploads it.
2. Muse Wonder reads the photo with the story so far. In one structured JSON reply, it decides what the photo means, writes a few lines and gives the next quest if there is one. A photo can answer the current quest, take the story somewhere new, or be a side note that leaves the quest open.
3. Unless the photo was a side note, Muse Spark compares Wren's lines with the photo and removes anything described as visible that isn't there. At the same time, if the next quest is a closer look, SAM finds its target in the photo and outlines it, so you know where to look.
4. If the photo turned up evidence, Muse Image paints an evidence card from it.

### The case

Every case has one question and a hidden answer that Wren decides at the start. Wren plans each chapter as places and objects to find, and each quest goes where the last find pointed, so the evidence forms a trail.

Each photo becomes something it could reasonably be in the story. After two side notes in a row, the next photo moves the story whatever it shows. If the evidence stops pointing to the answer, Wren changes the answer to fit everything found so far.

### Story memory

Wren keeps each story in three layers, saved after every turn:

| Layer | What it holds | How it changes |
| :--- | :--- | :--- |
| Skeleton | The hidden plan: the answer, what each chapter finds out, and the steps on each lead | Only when your photos no longer fit the plan |
| Bindings | Which real thing is which story element | Added or swapped on any turn |
| Canon | Facts already established in play | New facts are added, and old ones never change |

### Two players

A shared case has two leads that come at the answer from different sides, such as how it was done and who could have done it. Each player follows one lead without waiting for the other. Wren sees what both have found and mentions a partner's find when it changes what yours means. A chapter's ending is written from everything both players found. Turns are saved under a short per-story lock, so two photos sent at once both count. If your friend hasn't joined by the time your part is done, you can play their lead too.

## Privacy

- There is no account. A random ID in a cookie links your stories to your browser.
- The app never asks for your location. Photos are re-encoded on the phone before upload, which removes their location data, and walk times come from when photos were sent.
- Photos go to the Meta Model API, and Meta may use what it receives to improve its products. They are then stored in an encrypted private bucket, served only through unguessable links.
- An invite link shows only its own case, and a case has room for one friend, so a forwarded link can't let a third person in.
- Deleting a story also deletes its photos and evidence cards.

## Run it locally

You need Node.js 20.17 or later.

```sh
npm install
cp .env.example .env.local   # add MODEL_API_KEY to use the real models
npm run dev
```

Open http://localhost:3000. Without `MODEL_API_KEY`, Wren reads from a script, so you can work on the interface without spending credit. Without the Appwrite settings, it saves stories as files in `.data/`. `GET /api/health` shows which mode, models and storage are in use. The other settings, such as the daily call limits, are documented in [`.env.example`](.env.example).

To try it on a phone on the same Wi-Fi, open the Network address that `npm run dev` prints and scan the code it shows. Anyone on that network can reach the server, so stop it when you're done if a real key is set.

Run the unit tests with `npm test`.

## Deployment

The live game at [questory.run](https://questory.run) runs on [Vercel](https://vercel.com), and every merge to `main` deploys it. Stories, photos and evidence cards are stored in [Appwrite](https://appwrite.io).

## Project structure

```
app/page.tsx        Landing page, with a code to scan on a computer
app/how-it-works/   How a turn uses the four models
app/privacy/        What happens to photos and stories
app/play/           The game
app/api/            Route handlers for stories, turns, evidence cards, media and health
components/         The mobile interface
lib/gm/             Wren, the agent: state, prompts, output schemas, engine and a scripted mock
lib/meta/           Meta Model API clients for structured JSON, SAM 3.1 and Muse Image
lib/store/          Storage in local files or Appwrite
lib/client/         Browser code for photos, API calls and invite links
scripts/            Appwrite setup
```

## License

Questory is released under the [MIT License](LICENSE). The Barlow and Literata fonts are under the SIL Open Font License (see `app/fonts/`).
