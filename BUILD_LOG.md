# Build log

Running log of what was built, when (Pacific time), and which AI tool did what. Feeds the submission's "AI tools used" section. Newest at the bottom.

## Fri Nov 13, 2026

- **11:17 PM** — Session start on the build laptop. Claude Code (Claude Fable 5.1 in the Claude desktop app) read the team's handoff brief, verified the folder was empty, confirmed the Supabase and Vercel connectors worked. Found Node, Git and the GitHub CLI missing; team installed them with winget.
- **11:20 PM** — Phase 0 begins. Product name confirmed: **Facet**. Claude scaffolded a Next.js 16 app (App Router, TypeScript, Tailwind 4, ESLint) with create-next-app, moved it to the project root (the folder name has spaces, which the scaffolder rejects), ran `git init`, first commit.
- **11:24 PM** — Supabase quoted $10/month for a second project in the existing org. Team declined; a new free-plan org will be created by hand and the project created there. Nothing in the existing org was touched.
- **11:27 PM** — Claude wrote README.md, CREDITS.md, BUILD_LOG.md, .env.example and CLAUDE.md (the working rules).
- **11:30 PM** — Design system: "clinical luxe" tokens (ivory, ink, clinic green, severity ramp), Fraunces + Inter, Button/Card/Input/Chip/ScoreRing/BottomSheet, `/styleguide`. Checked in the browser.
- **11:45 PM** — Supabase schema (10 tables, RLS, private `scans` bucket, realtime) and sample-clinic seed written as migrations; not yet applied (no Supabase project yet).

## Sat Nov 14, 2026

- **12:00 AM** — Design-direction question raised by the team (reuse the old app's look). Claude pulled the hackathon guide: the FAQ says old "screens and landing pages" in the demo disqualify. Decision deferred to a Discord ruling Saturday morning; building continues on the new design.
- **12:10 AM** — Phase 1 begins. A research subagent verified current model IDs from provider docs: OpenAI `gpt-image-1` was retired Oct 23 2026, current edit model `gpt-image-2.5-sunburst`; Gemini image editing is `gemini-nano-banana-2.1` (prompt-only, no pixel mask); fal `flux-pro/kontext` $0.04/image and `flux-pro/v1/fill` for masks; vision JSON model `gpt-6.1-terra` ($1/$5 per 1M tokens); Perfect Corp Skin Analysis is self-serve, ~$0.43 per 4-concern scan.
- **12:15–1:30 AM** — Claude built the scan core: consent screen, live MediaPipe Face Landmarker capture (478-point mesh, sweep, zone-by-zone mapping, six quality gates, auto-capture, upload fallback, in-app-browser detection), landmark zone geometry + feathered masks + heat maps, `/api/analyze` (strict JSON schema, clinic-menu matching, 72 h photo retention when Supabase is on), `/api/simulate` with Gemini / fal / OpenAI adapters, client-side masked compositing with color match and a live dose blend, results screen (score ring + Potential, skin age, three.js mesh, concern cards, treatments with "why relevant", before/after + dose sheet), hidden `/lab` bake-off. Verified in the browser pane: landing, consent, camera-blocked fallback, lab. Real camera test pending a phone over HTTPS; analysis and simulation pending API keys.
