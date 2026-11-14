# CLAUDE.md — working rules for this repo

Facet is a from-scratch build for the CPVC × OCOB × CPE AI Hackathon (Cal Poly SLO, Fri Nov 13 5:00 PM → Sun Nov 15 12:00 PM Pacific, 2026). Breaking any rule below can disqualify the team.

## Provenance

- Everything here was created after Fri Nov 13, 2026, 5:00 PM Pacific. Build everything new in this repo.
- Never read from, open, or copy out of other folders on this machine (anything named `atlas*`, OneDrive Atlas folders, other repos). Not code, not components, not logos, not screenshots, not copy.
- Open-source libraries, public templates and APIs are fine. List each one in `CREDITS.md` with its license and what it does.
- One project from Friday on. Never start over in a fresh repo.

## Git

- Commit early and often with clear messages, at every working step. Judges read the history.
- Never squash, rebase away, amend-away or delete commits. Never force-push.

## Secrets

- No API keys or secrets in code, commits, screenshots, logs or videos. `.env.local` only (gitignored), plus `.env.example` with blank values.
- Public inserts (leads, scans, events) go through server routes using the Supabase secret key. The browser never gets the secret key.

## Data honesty

- No fake data presented as real. Sample/demo rows are flagged `is_sample = true` and labeled "Sample" in the UI; exclude them from any proof counts.
- Testimonials and quotes only if real, verbatim, with permission.

## Biometrics and safety (California)

- Selfies are biometric data. Consent checkbox before the camera opens; say plainly it's a student hackathon project; say how long the photo is kept.
- Raw photos auto-delete after 72 hours unless the person explicitly opts to keep them. Never use a photo for anything else. Photos live in a private Storage bucket, signed URLs only.
- 18+ only.
- Results are "cosmetic estimates, not a medical diagnosis". If something looks medical (for example a suspicious mole), suggest seeing a doctor instead of a cosmetic treatment.

## Logging

- Keep `BUILD_LOG.md` current: time, what was built, which AI tool did what.

## Stack notes

- Next.js 16 App Router. Its APIs differ from older versions: read `node_modules/next/dist/docs/` before writing unfamiliar code (see `AGENTS.md`).
- Tailwind CSS 4 (CSS-first config in `src/app/globals.css`). Design tokens are CSS variables there; see `/styleguide`.
- Supabase: new project for Facet only. Never touch the existing Atlas project. Migrations are saved in `supabase/migrations/`.
- Vercel: new project for Facet only.
- Check current model IDs in provider docs at build time; don't guess them.
