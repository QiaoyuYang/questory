# Questory

A game that gives you a reason to go for a walk. Take a photo of wherever you are, and an AI game master writes a short quest based on what's actually around you, as part of a story that continues across your walks.

Built for the Meta Global AI Developer Hackathon on the Meta Model API.

## How a turn works

1. **You take a photo of anything**, or upload one. It can be what the quest asked for or whatever catches your eye. The browser shrinks it to 1280px and uploads it.
2. **Muse Wonder plays Wren, the game master.** It reads the photo and the story so far, decides what the photo means, narrates, and leaves the next quest, all as structured JSON. A photo can follow the quest, move the story somewhere new, or add a clue on the side. No photo fails.
3. **SAM 3.1 grounds the target.** When the next quest asks you to take a closer look at something in your photo ("the blue door"), SAM finds it and the app traces its outline.
4. **Muse Image paints a story card.** When a photo moves the story, it becomes a card with a title and caption drawn on. Cards are keepsakes, so they never cover the photo you navigate by.

Quests are suggestions. If two photos in a row only add side notes, the game master moves the story forward with the next one, whatever it shows.

### How the game master remembers

The story state has three layers, and the prompts treat each one differently:

| Layer | What it holds | How it changes |
| --- | --- | --- |
| Skeleton | Hidden premise, antagonist, stakes, ending, and 5 to 7 beats written as goals that work anywhere | Re-planned only when the world forces it, and always narrated as a twist |
| Bindings | Which real thing stands in for which story element ("the dead drop" is "the red mailbox") | Freely, every turn |
| Canon | Facts already established in play | Never contradicted |

A walk is one chapter of about three steps forward. The state is saved after every turn, so the next walk picks up where the last one ended. The skeleton is never sent to the browser.

## Run it

```sh
npm install
cp .env.example .env.local   # add MODEL_API_KEY to use the real models
npm run dev
```

Open http://localhost:3000. Without `MODEL_API_KEY` the app runs a scripted game master (it can't see photos), so you can work on the UI without spending credits. `GET /api/health` shows which mode and models are active.

To play on your phone during development, run `npm run dev` and open the Network address it prints, such as `http://192.168.1.65:3000`, on a phone on the same Wi-Fi. Anyone on that network can reach it while it runs, so stop it when you're done if a real API key is set. On an iPhone, Share and then Add to Home Screen gives it an icon, and it opens full screen like an app.

## Storage

Without Appwrite settings, stories and photos are saved as files in `.data/`. That's fine locally but won't survive on serverless hosts. For deployment:

1. Create an Appwrite project and an API key with every Database and Storage scope.
2. Fill in `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY` in `.env.local`.
3. Run `npm run setup:appwrite`. It creates the `questory` database, the `stories`, `turns` and `usage` tables, and a private `media` bucket. Run it again after updating; it only adds what's missing.

Players are anonymous: a random id in an httpOnly cookie.

## Deploy

Any Node host works. On Vercel:

1. Import the repo. Vercel detects Next.js, so the build settings can stay as they are.
2. Add `MODEL_API_KEY` and the three `APPWRITE_` values for Production and Preview. Vercel can't keep files between requests, so stories need Appwrite there.
3. Deploy, then open `/api/health`. It should show `"mode":"live"` and `"storage":"appwrite"`.

Every pull request gets its own preview link. The card route can run for up to three minutes, which fits the five that Vercel's free plan allows.

Two things to know before sharing the link:

- **Whoever can open the site spends your Meta credit.** `DAILY_CALL_LIMIT` caps what a day can cost. Vercel leaves the production URL public by default. To keep it private while testing, set Deployment Protection to All Deployments with Vercel Authentication, which is free on every plan.
- **Free Appwrite projects pause after 7 days without development activity in the Console.** A paused project can't load or save stories. Use the Console every few days while people are playing, and reactivate the project there if it pauses.

## Configuration

All settings are environment variables; `.env.example` documents each one. The ones you're most likely to change:

| Variable | Default | What it does |
| --- | --- | --- |
| `GM_REASONING_EFFORT` | `minimal` | Muse Wonder's effort. Higher is slower and costs more |
| `QUEST_CARDS` | `on` | Turn off to skip Muse Image (the outline still shows the target) |
| `SAM_GROUNDING` | `on` | Turn off to skip target outlines |
| `DAILY_CALL_LIMIT` | `200` | Paid calls per UTC day across all players. Each story start, photo, walk end and painted card counts once. `0` turns it off |

## Cost

A photo turn sends about 3,000 to 4,000 input tokens (the photo is about 1,400 of them) and gets 1,000 to 2,000 back, which comes to roughly 3 to 5 cents on Muse Wonder. A story card adds 1 cent. Every model call logs its token use to the server console. The default `DAILY_CALL_LIMIT` of 200 keeps a bad day to roughly $10.

## Project layout

```
app/api/            Route handlers: stories, turns, story cards, media, health
components/         The mobile UI
lib/gm/             The game master: state schema, prompts, output schemas, engine, scripted mock
lib/meta/           Meta Model API clients: structured JSON, SAM 3.1 grounding, Muse Image edits
lib/store/          Storage: local files or Appwrite
scripts/            Appwrite setup
```

## Credits

Fonts: Barlow and Literata, both under the SIL Open Font License (see `app/fonts/`).
