# Zavodnoy Kaban (MVP)

Telegram Mini App + bot + backend for fast shift logging and group job post ingestion.

## Monorepo
- `apps/api`: Express + Prisma (SQLite)
- `apps/bot`: grammY bot
- `apps/web`: Vite + React + Tailwind mini app
- `packages/shared`: shared types, parser, stats utils

## Local setup

```bash
pnpm i
cp .env.example .env
```

### Prisma

```bash
pnpm --filter @zavod/api prisma:generate
pnpm --filter @zavod/api prisma:migrate
```

### Run everything

```bash
pnpm dev
```

The web app runs on `http://localhost:5173`, API on `http://localhost:3001`.

## Telegram bot setup

1. Create a bot with [@BotFather](https://t.me/botfather) and copy the token.
2. Put the token into `.env` as `TELEGRAM_BOT_TOKEN`.
3. For local dev, expose your web app (ngrok or Cloudflare Tunnel) and set `WEBAPP_URL`.
4. Run `pnpm dev`.

### Polling vs webhook
This MVP uses long polling (no webhook required). If you want webhooks, set it yourself and run bot behind HTTPS.

## Workspace linking and ingestion

1. Start a private chat with the bot and run:
   - `/create_workspace <title>`
2. Add the bot to a Telegram group.
3. In the group chat run:
   - `/link <workspaceId>`
4. Every non-command message in the group becomes a JobPost with inline buttons:
   - Analyze / Create shift / Ignore

## Mini app flow

- Open the mini app from `/start`.
- Select workspace, open Inbox, analyze job posts, create shifts.
- Use Share to post summaries back to the linked group.

## Tests

```bash
pnpm --filter @zavod/shared test
```
