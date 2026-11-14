# Build log

Running log of what was built, when (Pacific time), and which AI tool did what. Feeds the submission's "AI tools used" section. Newest at the bottom.

## Fri Nov 13, 2026

- **11:17 PM** — Session start on the build laptop. Claude Code (Claude Fable 5.1 in the Claude desktop app) read the team's handoff brief, verified the folder was empty, confirmed the Supabase and Vercel connectors worked. Found Node, Git and the GitHub CLI missing; team installed them with winget.
- **11:20 PM** — Phase 0 begins. Product name confirmed: **Facet**. Claude scaffolded a Next.js 16 app (App Router, TypeScript, Tailwind 4, ESLint) with create-next-app, moved it to the project root (the folder name has spaces, which the scaffolder rejects), ran `git init`, first commit.
- **11:24 PM** — Supabase quoted $10/month for a second project in the existing org. Team declined; a new free-plan org will be created by hand and the project created there. Nothing in the existing org was touched.
- **11:27 PM** — Claude wrote README.md, CREDITS.md, BUILD_LOG.md, .env.example and CLAUDE.md (the working rules).
