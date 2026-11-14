# Facet

A free AI face scan that any med spa can put in every patient's pocket, and that turns every scan into a booked appointment and a patient who keeps coming back.

Built from scratch at the **CPVC × OCOB × CPE AI Hackathon**, Cal Poly San Luis Obispo, **Nov 13–15, 2026**. Entered in the main competition and the **Startup Launch Award** challenge.

## What it does

Three users, one loop:

1. **Patient (phone).** Taps an ad or a QR code, consents, and a live 3D face mesh maps her face in the browser. She gets a skin score, heat maps of her concerns, and a realistic "after" for a treatment from *this clinic's* menu, with a dose slider from Subtle to Full. She books inside the scan, gets reminded when the treatment wears off, and earns rewards for coming back.
2. **Front desk / clinic owner (laptop).** Every scan arrives as a lead with scores, the "after" she liked, matched treatments and an AI-drafted first text. Patients due for a touch-up surface automatically.
3. **Clinic owner who isn't a customer yet.** Types her spa's name, and AI builds her own branded scanner from her website, with her real menu, in about a minute.

## Status

Phase 0 (setup) in progress. See `BUILD_LOG.md` for a timestamped log of what was built and which AI tools did what.

- Live URL: _coming in Phase 0_
- Repo: _this one_

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, Supabase (Postgres, Auth, Storage, RLS), Vercel. In-browser face tracking with MediaPipe Face Landmarker. Skin analysis and after-simulation through external AI APIs (see `CREDITS.md`).

## Team

Atlas Engine, San Luis Obispo. Andrew Montano (product), Adrian (clinic relationships), plus teammates on clinic visits and pitch.

## Honesty notes

- Everything in this repo was written after Friday Nov 13, 2026, 5:00 PM Pacific. The team runs a small agency that has worked with med spas before; we brought the idea and what we learned, not code.
- Sample data is labeled "Sample". Nothing presented as proof is fabricated.
- Results are cosmetic estimates, not a medical diagnosis. Selfies are biometric data; we ask for consent before the camera opens and auto-delete raw photos after 72 hours unless the patient opts to keep them.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in values; never commit .env.local
npm run dev
```
