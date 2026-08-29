# U — enter the multiverse

The BELLE brief, built. Next.js 16 (App Router, Turbopack) · React 19 · Tailwind 4 · Motion 13 · Supabase.

```bash
npm run dev
```

With no Supabase env vars set it runs on the seeded multiverse in `src/lib/soul.ts` and says so in the
corner. Point it at a database and the world starts remembering.

## Connect the database

1. Create a Supabase project, then **Authentication → Sign In / Providers → Anonymous sign-ins: on**.
   Souls arrive without an email, a password, or a real name — that is the whole idea.
2. Run the schema: `supabase link --project-ref <ref> && supabase db push`, or paste
   `supabase/migrations/20260829000000_init.sql` into the SQL editor. It creates the tables, the RLS
   policies, realtime, and the twelve founding souls so the rooms are not empty on day one.
3. `cp .env.local.example .env.local` and fill in the Project URL and the anon/publishable key from
   **Project Settings → API**. Never the `service_role` key — this app is entirely client-side.

## What is stored

| Table | Holds |
| --- | --- |
| `souls` | shape, colour, aura, name, tagline. `user_id` is null for the founding souls |
| `messages` | one per region, 400 chars, tied to a soul |
| `resonances` | a vibration, not a like — primary key `(message, soul)`, so once each |
| `discoveries` | which lore fragments a soul has recovered; six of them opens The Void |
| `region_stats` | a view: how many souls have spoken in each region, and how much |

RLS: souls and messages are readable by everyone, writable only as yourself; discoveries are readable
only by the soul that found them. Realtime carries new messages and resonances; Supabase Presence gives
each region its live "N present" count.

## The journey

`src/app/page.tsx` is a five-stage machine — `enter → forge → arrive → map → region` — swapped through one
`AnimatePresence`, so each screen dissolves into the next rather than cutting. A returning soul skips the
forge and lands straight on the map.

| Screen | File | The animation that carries it |
| --- | --- | --- |
| Landing | `components/Landing.tsx` | Cursor-parallax 3D tilt on the word, a ring that keeps leaving, and a warp through the starfield when you step in |
| Soul forge | `components/SoulForge.tsx` | Your avatar *morphs* between shapes — circle melts into crescent — while the whole world recolours to your soul |
| Arrival | `page.tsx` | The avatar flies in on a shared `layoutId` and the welcome lines surface one at a time |
| Multiverse | `components/Multiverse.tsx` | Cards tilt in 3D under the cursor with a light that follows it; clicking one grows it into the room |
| A region | `components/RegionView.tsx` | Messages spring in live, resonance makes them glow brighter, and a fragment of lore glimmers somewhere in the room |

## How the shapes morph

`src/lib/soul.ts` samples every shape — circle, triangle, diamond, star, crescent (a real
circle-minus-circle arc) — to the same 96 points, so one `d` string interpolates smoothly into the next.
Everything else in the file is world data: regions, palettes, auras, lore, rank thresholds.

```bash
npm test   # geometry + rank invariants
```

## Deploying (Netlify)

There is no separate backend. Every page is prerendered static HTML and all the data work happens in the
browser against Supabase, so the whole thing is a static site plus a database somebody else runs.

1. Push the repo and point Netlify at it — it detects Next.js on its own, no `netlify.toml` needed.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under **Site configuration →
   Environment variables**, before the first build.
3. These are inlined into the bundle at build time, not read at runtime, so after adding or changing them
   you must **Clear cache and deploy site** — a plain redeploy can reuse the old bundle. If the corner of
   the live site says `no database · seeded multiverse`, this step is what is missing: every visitor is
   then talking to their own browser and nobody can see anyone else.

Nothing is needed on the Supabase side — anonymous sign-in uses no redirect URLs.

If you ever want to drop the Next runtime entirely, `output: "export"` in `next.config.ts` makes it a
folder of files that any static host will serve — nothing in the app needs a server.

## Not built

Voice channels (Agora/Daily), 3D avatars (three.js), mobile/AR/VR, the monthly Awakening event, guardian
moderation tools, pre-launch email capture. Everything else in the brief is here.
