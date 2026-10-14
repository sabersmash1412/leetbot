# LeetBot

A free, multi-group LeetCode accountability Telegram bot for study groups of friends. Add it to any number of Telegram groups — each group gets its own roster, its own custom question roadmap (or a ready-made preset), and its own independent progress tracking. No paid services required.

## What it does

- Every morning, posts the group's next target question from its roadmap, with a button linking straight to LeetCode.
- Every 15–30 minutes, polls each registered member's public LeetCode profile and celebrates in the group chat the moment someone solves the target question.
- Every evening, calls out who still hasn't solved today's question ("Wall of Shame").
- Also tracks LeetCode's public Daily Challenge for bonus shout-outs.
- Users never paste code into Telegram — they solve on leetcode.com as normal, and the bot notices automatically via LeetCode's public submission data.

## Architecture

- **Node.js + Telegraf** for the bot, **Express** as the HTTP server, **Mongoose/MongoDB Atlas** (free M0 tier) for storage.
- **Webhook mode**, not long-polling — Telegram pushes updates to an Express route, same server that hosts the cron endpoints.
- **No internal scheduler.** Free hosts (Render, Railway) sleep idle processes, so there's no `node-cron` running inside the app. Instead, three HTTP endpoints (`/cron/morning`, `/cron/poll`, `/cron/evening`) are guarded by a shared secret and triggered by an external free scheduler (cron-job.org or UptimeRobot). These pings also double as keep-alive traffic.
- Roadmaps are configured entirely through Telegram commands — no web dashboard, no JSON file editing per group.

## Prerequisites

- Node.js 20+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) M0 cluster, with a database user that has read/write access
- A [Render](https://render.com) (or Railway) account for hosting
- A free account on [cron-job.org](https://cron-job.org) (or [UptimeRobot](https://uptimerobot.com)) for scheduling

## Local development

```bash
npm install
cp .env.example .env
# fill in TELEGRAM_BOT_TOKEN and MONGODB_URI at minimum
npm run dev
```

Webhook mode needs a public HTTPS URL, so for local testing either:
- tunnel your local server with `ngrok http 3000` and set `PUBLIC_URL` to the ngrok URL, or
- leave `PUBLIC_URL` unset — the app will start and log a warning that the webhook wasn't registered, which is fine for testing non-Telegram parts (e.g. hitting `/cron/*` endpoints directly, or running `npm test`).

Run the test suite:

```bash
npm test
```

Validate the bundled preset files:

```bash
npm run validate-presets
```

## Deploying to Render (free tier)

1. Push this repo to GitHub.
2. Create a new Web Service on Render, connect the repo.
3. Build command: `npm install`. Start command: `node src/index.js`.
4. Set all env vars from `.env.example` in Render's dashboard (Environment tab).
5. After the first deploy, set `PUBLIC_URL` to the Render-assigned URL (e.g. `https://leetbot.onrender.com`) and redeploy — or rely on Render's auto-injected `RENDER_EXTERNAL_URL`, which `config.js` falls back to automatically.
6. Confirm the webhook registered: visit `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` and check the `url` field matches your deployment.

## Configuring external cron pings (cron-job.org)

1. Create a free account at cron-job.org.
2. Create three cron jobs, each a `GET` request:
   - `https://<your-app>/cron/morning?key=<CRON_SECRET>` — once daily, e.g. 9:00 AM
   - `https://<your-app>/cron/poll?key=<CRON_SECRET>` — every 15–30 minutes
   - `https://<your-app>/cron/evening?key=<CRON_SECRET>` — once daily, e.g. 10:00 PM
3. Set cron-job.org's timezone to match your group's local time — the app itself doesn't control scheduling, the external pinger does.
4. (Optional) Add a fourth ping on a short interval hitting `/healthz` to keep the free-tier instance from sleeping between scheduled jobs, if the 15–30 minute poll interval alone doesn't do it.

## Bootstrapping a new group

1. Add the bot to your Telegram group.
2. Any member runs `/register <leetcode_username>` to start being tracked.
3. A group admin runs either:
   - `/presets` then `/usepreset <name>` to instantly load a ready-made roadmap (see below), or
   - `/addmodule <name>` and `/addquestion <module#> <title> | <url>` repeatedly to hand-build one.
4. Wait for the next morning cron tick — the first question posts automatically.
5. Use `/roadmap`, `/status`, `/leaderboard`, `/whoami` anytime to check progress.

Admin-only commands are enforced via Telegram's own admin role (`getChatMember`) — no separate login system.

## Bundled presets

| Name | Display name | Questions |
|---|---|---|
| `blind75` | Blind 75 | 75 |
| `neetcode150` | NeetCode 150 | 150 |
| `grind75` | Grind 75 | 75 |
| `top-interview-150` | Top Interview 150 | 150 |

All four were pulled directly from LeetCode's own public list/study-plan API and validated (correct counts, no duplicate or unparsable problem URLs) — see `scripts/validatePresets.js`. Module groupings for Blind 75, NeetCode 150, and Grind 75 follow the widely-used community topic breakdowns; Top Interview 150's groupings come straight from LeetCode's own study plan sections.

Loading a preset with `/usepreset` replaces the group's current roadmap wholesale (with a confirmation step if one already exists) and resets progress tracking to the start. Admins can still `/addmodule`/`/addquestion` afterward to extend it.

## Environment variables

| Var | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `MONGODB_URI` | Atlas connection string |
| `CRON_SECRET` | Shared secret required as `?key=...` on all `/cron/*` endpoints |
| `PORT` | Express listen port (Render/Railway inject this automatically) |
| `PUBLIC_URL` | Public HTTPS base URL, used to register the Telegram webhook (falls back to Render's `RENDER_EXTERNAL_URL`) |
| `WEBHOOK_SECRET_PATH` | Random path segment for the webhook route, e.g. `tg-7f3a9c2e` — keeps random scanners from POSTing fake updates |
| `TZ` | Cosmetic only — scheduling itself is controlled by your external cron pinger, not this app |
| `NODE_ENV` | `production` / `development` |
| `LOG_LEVEL` | `error` / `warn` / `info` / `debug` |

## Known limitations

- Relies on LeetCode's **unofficial, undocumented** GraphQL endpoint (`leetcode.com/graphql`). It could change or restrict access at any time without notice.
- Only detects submissions from users whose LeetCode profile submission visibility is public (the default). If a friend has disabled this in their privacy settings, the bot won't see their solves.
- Free-tier hosting means an occasional cold-start delay (30–60s) on the first cron ping after a long idle period.
- "Time-boxed" roadmap advancement (requirement, not a bug): the morning post always advances to the next question regardless of whether everyone finished the previous one — stragglers show up in `/status` and the evening Wall of Shame instead of blocking the group's pace.
