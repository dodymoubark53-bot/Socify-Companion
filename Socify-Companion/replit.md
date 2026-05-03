# SOCIFY — Social Media Marketing SaaS

## Overview

Full-stack Social Media Marketing SaaS platform built as a pnpm monorepo. Dark-only premium design inspired by Linear/Vercel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite, TanStack Query, wouter, Zustand, shadcn/ui, Tailwind CSS v4, Recharts, Framer Motion, socket.io-client
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- **Auth**: JWT (jsonwebtoken) stored in localStorage as `socify_token`
- **Rate limiting**: express-rate-limit (500/15min global, 20/15min auth) — trust proxy enabled
- **Background jobs**: node-cron (post scheduler every minute, weekly digest Mondays 9am)
- **Real-time**: Socket.io 4.x (server on `/api/socket.io`, workspace rooms)
- **Email**: nodemailer (SMTP via env vars, console fallback in dev)
- **File uploads**: multer + local disk (Cloudinary auto-upgrade via env vars)

## Workspace Structure

```
artifacts/
  api-server/          — Express 5 backend (port 8080, path /api)
  socify/              — React+Vite frontend (port 23788, path /)
  mockup-sandbox/      — Component preview server
lib/
  api-spec/            — OpenAPI spec + Orval codegen config
  api-client-react/    — Generated TanStack Query hooks
  api-zod/             — Generated Zod schemas
  db/                  — Drizzle ORM client + schema
scripts/
  src/seed.ts          — Main database seed script (users, posts, inbox, etc.)
  src/seed-extras.ts   — Extra seed: influencers + link-in-bio data
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/scripts run seed` — seed the database with demo data
- `pnpm --filter @workspace/scripts run seed-extras` — seed influencers + link-in-bio data

## Demo Credentials

- **Email**: alex@socify.io
- **Password**: password123
- **Workspace ID**: 1 (Socify Demo)

## All Pages / Routes

| Route | Page | Status |
|---|---|---|
| `/login` | Login | ✅ |
| `/register` | Register | ✅ |
| `/forgot-password` | Forgot Password (API wired) | ✅ |
| `/reset-password` | Reset Password (JWT token) | ✅ |
| `/dashboard` | Dashboard | ✅ |
| `/inbox` | Unified Smart Inbox | ✅ |
| `/composer` | Post Composer | ✅ |
| `/calendar` | Content Calendar | ✅ |
| `/analytics` | Analytics | ✅ |
| `/crm` | CRM / Lead Pipeline | ✅ |
| `/campaigns` | Campaigns | ✅ |
| `/listening` | Social Listening | ✅ |
| `/automations` | Automations | ✅ |
| `/influencers` | Influencers | ✅ |
| `/link-in-bio` | Link in Bio Builder | ✅ |
| `/admin` | Admin Panel | ✅ |
| `/settings` | Settings (team invite + billing plans) | ✅ |
| `/notifications` | Notifications Center | ✅ |

## All Features

### Core
- **Auth**: JWT register/login/logout/me/forgot-password with rate limiting + SMTP email
- **Dashboard**: KPI summary, upcoming posts, recent activity
- **Real-time**: Socket.io workspace rooms — inbox updates, reply notifications broadcast live

### Publishing
- **Post Composer**: Multi-platform, AI caption, hashtag suggestions, scheduling, media upload (multer/Cloudinary), UTM Builder
- **UTM Builder**: Full UTM parameter builder with one-click copy or "add to caption", live URL preview
- **Content Calendar**: Custom month-grid calendar with post dots per platform

### Analytics
- **Overview metrics**: Followers, reach, engagement, posts with % trends
- **Engagement Timeline**: AreaChart + LineChart over 7d/30d/90d
- **Post Timing Heatmap**: 7-day × 24-hour engagement heatmap with color intensity scale
- **Competitor Benchmarking**: Bar chart comparing your brand vs 3 competitors across 4 metrics

### CRM / Growth
- **CRM Pipeline**: Kanban board across 5 stages, per-card value display
- **Lead Modal**: Full lead details, stage mover, score bar, notes input, activity timeline (stage changes, emails, score updates, user notes)
- **Campaigns**: Budget tracking, status badges, ROI
- **Social Listening**: Keyword monitoring, mentions, sentiment, spike alerts
- **Influencers**: Discovery + partnership tracking
- **Link in Bio**: Visual builder with live preview + click tracking

### Automations
- **Workflow List**: Active/inactive toggle, run count, last-run time
- **Visual Workflow Builder**: Modal canvas with trigger picker (6 types) + action picker (6 types), node graph display with directional arrows, save & activate

### Platform
- **RBAC Middleware**: Role hierarchy (owner > admin > editor > analyst > viewer) with `requireRole()`, `requireAdmin`, `requireEditor` helpers
- **Plan Limits Middleware**: Per-plan limits for postsPerMonth, socialAccounts, teamMembers with HTTP 403 + upgrade message
- **File Upload Route**: `POST /api/upload` — multer + local disk, auto-upgrades to Cloudinary if env vars set
- **SMTP Email**: nodemailer with HTML templates, console-fallback in dev
- **Rate Limiting**: Global 500/15min, auth 20/15min, trust proxy enabled
- **Post Scheduler**: node-cron auto-publishes scheduled posts every minute
- **Weekly Digest**: node-cron creates notifications every Monday 9am

## Environment Variables (Optional)

| Var | Purpose |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | From address (default noreply@socify.app) |
| `CLIENT_URL` | Frontend URL for password reset links |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for media uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SESSION_SECRET` | JWT signing secret (required in prod) |

## DB Schema

Tables: `users`, `workspaces`, `workspace_members`, `social_accounts`, `posts`, `inbox_messages`, `leads`, `campaigns`, `listening_keywords`, `listening_mentions`, `automations`, `notifications`, `influencers`, `link_in_bio`, `link_in_bio_links`

## Design Tokens

- Background: `#09090B` (page), `#111113` (cards)
- Accent: `#6366F1` (indigo)
- Font: Geist (Google Fonts), Inter fallback
- Dark-only mode forced via `class="dark"` on `<html>`
