# Submission text (draft for the Sunday 12:00 PM form)

Fill in the bracketed parts Sunday morning. Keep the provenance paragraph verbatim.

## Project

**Origami** (by Atlas Engine; working name during the build: Facet) — a free AI face scan any med spa can put in every patient's pocket, that turns every scan into a booked appointment and a patient who keeps coming back.

## Problem and who has it

Med spa owners in SLO County (and the ~10,000 US med spas) pay thousands for a skin scanner that sits in a back room and only works on people who already walked in, then pay for ads to find patients who get one treatment and never hear from the clinic again. [Replace with Saturday's clinic quotes and numbers.]

## What we built this weekend

A patient web app: consent, live 3D face mesh in the browser (478 points, quality gates, auto-capture), AI skin analysis with heat maps, treatments matched from the clinic's real menu with prices, a realistic "after" that only changes the treated zone with a Subtle-to-Full dose slider, booking, and recall. A clinic dashboard with leads, AI-drafted follow-up texts and a "due for a touch-up" list. An owner funnel that builds a clinic's branded scanner from its website in about a minute. [Trim to what shipped.]

## AI tools used and what each did

- Claude (Claude Code in the Claude desktop app) wrote the code, SQL, copy and docs from the team's briefs and set up Supabase and Vercel through connectors.
- MediaPipe Face Landmarker (on-device): live face mesh, quality gates, zone masks.
- OpenAI [model]: skin analysis with a strict JSON schema; treatment matching and "why this is relevant" text; AI-drafted follow-up texts.
- [Gemini / FLUX via fal / OpenAI image edit, whichever won the bake-off]: the after-simulation, composited inside our landmark mask.

## Provenance (keep verbatim)

Every line of code was written after Friday 5:00 PM in one repository; the commit history shows it. Our team runs a small agency that had built a med spa app before the event; we brought the idea, not code. The visual design of Facet was derived from our prior app: we asked in #help on Friday night, organizers said restyling from our old app is fine if the code is rebuilt fresh in one repo and the submission notes it, so we kept reference stills in `reference/` and rebuilt every screen new. No code, components, assets or copy from the old product were used. The face scan, zone masking, masked after-simulation with dose control, and the owner funnel are new in concept as well as in code.

## Challenge

Startup Launch Award.

## Links

- Live: https://facet-tau-weld.vercel.app
- Repo: https://github.com/amonta16/facet (public since Sat Nov 14, 1:15 PM)
- Demo video (< 2 min, unlisted): [URL]
