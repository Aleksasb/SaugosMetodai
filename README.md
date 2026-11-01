# Passkeys + Next.js (App Router) Minimal Example

This repo shows **passwordless auth with passkeys** using WebAuthn and [`@simplewebauthn`](https://github.com/MasterKale/SimpleWebAuthn). It includes registration and sign-in.

## Stack

- Next.js App Router (TS)
- `@simplewebauthn/server` and `@simplewebauthn/browser`
- Prisma (SQLite) for persistence
- `iron-session` for cookie sessions

## Quick start

```bash
cp .env.example .env
npm i
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000/passkeys

> WebAuthn requires a **secure context**. `http://localhost` is allowed for development. For production set:
>
> - `WEBAUTHN_RP_ID` to your domain (e.g., `example.com`)
> - `WEBAUTHN_ORIGIN` to your origin (e.g., `https://app.example.com`)

## Files to look at

- `app/passkeys/page.tsx` – client UI calling WebAuthn
- `app/api/passkeys/*` – API routes for options + verification
- `lib/webauthn.ts` – RP config
- `lib/session.ts` / `lib/withSession.ts` – cookie sessions
- `lib/prisma.ts` – Prisma singleton
- `prisma/schema.prisma` – DB models

## Notes

- Keep at least one **recovery factor** (e.g., email link) in production.
