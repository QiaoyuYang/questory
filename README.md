<div align="center">

<img src="docs/banner.webp" alt="Walk outside with a story. Wren, an AI agent, builds a case from what you photograph during the walk. Follow Wren to solve the case. A street photo sits beside the same photo painted as a piece of evidence.">

# Questory

Play at [questory.run](https://questory.run)

[![CI](https://img.shields.io/github/actions/workflow/status/QiaoyuYang/questory/ci.yml?branch=main&label=CI)](https://github.com/QiaoyuYang/questory/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/github/license/QiaoyuYang/questory)](LICENSE) [![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org) [![Meta Model API](https://img.shields.io/badge/Meta_Model_API-Muse_%2B_SAM_3.1-0866FF?logo=meta&logoColor=white)](#how-it-works)

</div>

Questory is ready to play on phones, coming to Meta Glasses later this year. It was built on the Meta Model API for the Meta Global AI Developer Hackathon.

<div align="center">
<a href="https://youtu.be/6eSItLhW_d0"><img src="docs/demo.webp" width="640" alt="Watch the 3-minute demo on YouTube. A woman walks down a sunny street."></a>
</div>

<div align="center">
<table>
  <tr>
    <td align="center"><img src="public/landing/case-start.webp" width="230" alt="A photo of a bakery on a street corner, with the opening of a case below it and 5 minutes to walk before the next quest"><br>Your street starts the case</td>
    <td align="center"><img src="public/landing/case-find.webp" width="230" alt="A noticeboard photo painted as an evidence card called Spare key list, with the next quest below it"><br>Follow the quests</td>
    <td align="center"><img src="public/landing/case-so-far.webp" width="230" alt="The case so far: four pieces of evidence found, and eight more to find"><br>Solve the case</td>
  </tr>
</table>
</div>

31% of adults don't get enough physical activity, up from 23% in 2000 ([The Lancet Global Health, 2024](https://doi.org/10.1016/S2214-109X(24)00150-5)). Walking is one of the simplest ways to move more. 2.5 hours of brisk walking a week lower the risk of depression by 25% ([JAMA Psychiatry, 2022](https://doi.org/10.1001/jamapsychiatry.2022.0609)). Questory gives you a reason to take that walk, since every case is solved outside, on foot. More on the [Impact page](https://questory.run/impact).

## How to play

Wren, the AI game agent, builds a case from your street. A case is a question with a hidden answer. You solve it by walking and photographing what Wren asks for.

1. Pick a theme for the story, where you're walking (city streets, or a park or suburb), and how long: 15 minutes, 30 minutes or an hour.
2. Take a photo of where you are. Wren writes the opening of the case around it, then leads you outside if you aren't already.
3. Follow the quests to find evidence. You need to walk 5 minutes to unlock the next quest. Sometimes, Wren also asks for a closer look at something in the photo you took. A photo that moves the case forward becomes a piece of evidence.
4. Collect evidence until it points to the answer. A longer walk gets a longer case, with more chapters, sized so you can solve it before the walk is over. You can stop at any time, and your next photo picks the story up wherever you are.

To play with a friend, choose "With a friend" and send them the link. The case gets two leads, one for each of you: two trails of evidence that end at the same answer. You each follow yours on your own walk, and a chapter ends once you have both finished your part.

## How it works

Wren plans each case, reads every photo with what it remembers of the story, writes what happens and sets the next quest. When your photos stop fitting its plan, it changes the plan. Wren can't walk, so you do, and its quests say where to look.

Questory is built with the Meta Model API. Wren runs on Muse Wonder and has three subagents, each doing a specific job in the gameplay:

| Model | Role | What it does |
| :--- | :--- | :--- |
| Muse Wonder | Main agent | Wren: plans the case, reads each photo, and writes the story and quests |
| Muse Spark | Subagent | Verifies Wren's lines against the photo |
| SAM 3.1 | Subagent | Outlines what a closer-look quest points at |
| Muse Image | Subagent | Paints the evidence from the photo |

On a real game screen:

<img src="docs/screen.png" alt="A game screen with three numbered parts. 1: Muse Image painted the evidence from your photo. 2: Wren wrote the story on Muse Wonder, and Muse Spark checked it against your photo. 3: Wren set the next step, and SAM 3.1 outlined the door in your photo.">

### What happens to each photo

<img src="docs/turn.png" alt="Your photo goes to Muse Wonder, then to Muse Spark and SAM 3.1 at the same time, then into the story memory, and Muse Image paints any evidence. Wren reads the memory again on the next photo.">

1. You take a photo. The phone resizes it to 1280 px, re-encodes it as JPEG and uploads it.
2. Muse Wonder reads the photo with the story so far. In one structured JSON reply, Wren decides what the photo means, writes a few lines and gives the next quest if there is one. A photo can answer the current quest, take the story somewhere new, or be a side note that leaves the quest open.
3. Unless the photo was a side note, Muse Spark compares Wren's lines with the photo and removes anything described as visible that isn't there. At the same time, if the next quest is a closer look, SAM 3.1 finds its target in the photo and outlines it, so you know where to look.
4. The story memory is saved.
5. If the photo turned up evidence, Muse Image paints it from the photo.

### How Wren keeps a case together

Every case has one question and a hidden answer that Wren decides at the start. Wren plans each chapter as places and objects to find, and each quest goes where the last find pointed, so the evidence forms a trail.

Each photo becomes something it could reasonably be in the story. After two side notes in a row, the next photo that can count moves the story whatever it shows. If the evidence stops pointing to the answer, Wren changes the answer to fit everything found so far.

A case moves on foot, and fits in one walk. A 15-minute walk gets one chapter of three pieces of evidence, 30 minutes two such chapters, and an hour three chapters of four. You need to walk 5 minutes, counted down on screen, to unlock the next quest, and the camera waits until then. If the first photo is taken indoors, the next quest in the story will lead the player outside, with no countdown.

The story gives a reason the trail goes on, and quests ask for things common where you said you'd walk. Each quest remembers what its photo showed, so Wren can tell whether the next photo was taken somewhere else, and a photo from the same place is a side note. Sometimes the photo a quest leads you to only shows the place, and Wren asks for a closer look at something in it. Distance is estimated with walking time and photo dissimilarity, so the game never needs your location.

Wren's memory of a case has three layers, saved after every photo:

| Layer | What it holds | How it changes |
| :--- | :--- | :--- |
| Skeleton | The hidden plan: the answer, what each chapter finds out, and the steps on each lead | Only when your photos no longer fit the plan |
| Bindings | Which real thing is which story element | Added or swapped with any photo |
| Canon | Facts already established in play | New facts could be added, but old ones never change |

### Two players

A shared case has two leads that come at the answer from different sides, such as how it was done and who could have done it. Each player follows one lead without waiting for the other. Wren sees what both have found and mentions a partner's find when it changes what yours means. A chapter's ending is written from everything both players found. Each photo is saved under a short per-story lock, so two photos sent at once both count. If your friend hasn't joined by the time your part is done, you can play their lead too.

<div align="center">
<table>
  <tr>
    <td align="center"><img src="public/landing/case-invite.webp" width="230" alt="A friend's phone opening the invite: a case about prize tomato seedlings missing from a shed, a choice of city streets or a park or suburb, and a button to join it"><br>Send a friend the link</td>
    <td align="center"><img src="public/landing/together.webp" width="230" alt="The shared case: one piece of evidence found by you and one by your partner, with 22 more to find"><br>Solve it together</td>
  </tr>
</table>
</div>

## Deployment

The live game at [questory.run](https://questory.run) runs on [Vercel](https://vercel.com), and every merge to `main` deploys it. Stories, photos and evidence cards are stored in [Appwrite Cloud](https://appwrite.io). To deploy your own copy:

1. In Appwrite, create a project and an API key with every Database and Storage scope.
2. Clone this repo and run `npm install`. Put the Appwrite endpoint, project ID and key in `.env.local`, then run `npm run setup:appwrite` once. It creates the database, its tables and a private bucket for photos and evidence cards.
3. Import the repo into Vercel. Under environment variables, add your Meta Model API key as `MODEL_API_KEY`, and the same three Appwrite values. The optional settings, such as the daily call limits, are listed in [`.env.example`](.env.example).
4. Deploy, then open `/api/health` on your domain. It should show `live` mode and `appwrite` storage.

## Run it locally

You need Node.js 22 or 24.

```sh
npm install
cp .env.example .env.local   # add MODEL_API_KEY to use the real models
npm run dev
```

Open http://localhost:3000. Without `MODEL_API_KEY`, Wren reads from a script, so you can work on the interface without spending credit. Without the Appwrite settings, it saves stories as files in `.data/`. `GET /api/health` shows which mode, models and storage are in use. The other settings, such as the daily call limits, are documented in [`.env.example`](.env.example).

To try it on a phone on the same Wi-Fi, open the Network address that `npm run dev` prints and scan the code it shows. Anyone on that network can reach the server, so stop it when you're done if a real key is set.

Run the unit tests with `npm test`.

## Project structure

```
app/page.tsx        Landing page, with a code to scan on a computer
app/how-it-works/   How Wren and its subagents turn photos into a case
app/impact/         Why it's played on foot
app/privacy/        What happens to photos and stories
app/play/           The game
app/api/            Route handlers for stories, turns, invites, evidence cards, media and health
components/         The game's screens, and the parts the site's pages share
lib/gm/             Wren, the agent: state, rules, prompts, output schemas, engine and a scripted mock
lib/meta/           Meta Model API clients for structured JSON, SAM 3.1 and Muse Image
lib/store/          Storage in local files or Appwrite
lib/client/         Browser code for photos, API calls and invite links
lib/*.ts            Settings, the player cookie, shared types, walk times and the Impact figures
tests/              Unit tests for the game rules, story state and walk times
scripts/            Appwrite setup
docs/               Images for this README
```

## Privacy

- There is no account. A random ID in a cookie links your stories to your browser.
- The app never asks for your location. Photos are re-encoded on the phone before upload, which removes their location data, and walk times come from when photos were sent.
- An invite link shows only its own case, and a case has room for one friend, so a forwarded link can't let a third person in.
- Deleting a story also deletes its photos and evidence cards.
- Photos go to the Meta Model API, and Meta may use what it receives to improve its products. They are then stored in an encrypted private bucket, served only through unguessable links.

## License

Questory is released under the [MIT License](LICENSE). We use the Barlow and Literata fonts in the UI, which are under the SIL Open Font License (see `app/fonts/`).
