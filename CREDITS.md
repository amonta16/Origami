# Credits

Every open-source library, API, font and model used in Facet, with its license and what it did. Updated as the build goes.

## Frameworks and libraries

| Name | License | What it does here |
|---|---|---|
| [Next.js](https://nextjs.org) 16 | MIT | App framework (App Router, server routes) |
| [React](https://react.dev) 19 | MIT | UI |
| [Tailwind CSS](https://tailwindcss.com) 4 | MIT | Styling, design tokens |
| [TypeScript](https://www.typescriptlang.org) | Apache-2.0 | Types |
| [ESLint](https://eslint.org) + eslint-config-next | MIT | Linting |
| [@mediapipe/tasks-vision](https://github.com/google-ai-edge/mediapipe) 1.2.3 | Apache-2.0 | In-browser Face Landmarker: 478 landmarks, blendshapes, live mesh. WASM served from jsDelivr, model from Google's public model bucket |
| [three](https://threejs.org) | MIT | Rotating 3D wireframe of the captured mesh on the results screen |
| [@supabase/supabase-js](https://github.com/supabase/supabase-js) | MIT | Server-side database and storage client |
| [qrcode](https://github.com/soldair/node-qrcode) | MIT | QR codes for the patient check-in screen, the owner funnel and front desk |
| [server-only](https://www.npmjs.com/package/server-only) | MIT | Guards server modules from client bundles |

## Fonts (Google Fonts, served via `next/font`)

| Name | License | Role |
|---|---|---|
| [Fraunces](https://fonts.google.com/specimen/Fraunces) | OFL-1.1 | Display serif for headlines and scores |
| [Inter](https://fonts.google.com/specimen/Inter) | OFL-1.1 | UI sans (front desk, owner pages) |
| [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) | OFL-1.1 | Patient app type, chosen to match the reference screenshots |
| [Caveat](https://fonts.google.com/specimen/Caveat) | OFL-1.1 | Handwritten tags on the themed gifts |
| [Frank Ruhl Libre](https://fonts.google.com/specimen/Frank+Ruhl+Libre) | OFL-1.1 | Serif headlines on the landing page, owner preview and desk logo |
| [Roboto Flex](https://fonts.google.com/specimen/Roboto+Flex) | OFL-1.1 | Body text on the landing page and owner preview |

## Images

| Image | Source and license | Where |
|---|---|---|
| "A woman with dark hair" (photo-1652226825940-46ad2a55d132) | [Unsplash](https://unsplash.com/photos/a-woman-with-dark-hair-0NDVW4wO1Ms), free under the Unsplash License; hotlinked from Unsplash's CDN | Example face on the skin-analysis card and the scan consent screen, labeled "Example photo · Unsplash". Landmarks measured with MediaPipe in the browser. |
| Origami bird logo (`public/brand/atlas-engine-bird.png`, `src/app/icon.png`, `src/app/apple-icon.png`) | Supplied by the team (Atlas Engine) in chat on Sat Nov 14, 2026 as their brand mark; background removed with ffmpeg. Claude noted it matches origami.chat's logo; the team confirmed they want it used. | Landing header, desk sidebar, favicon and home-screen icon |
| Stock treatment, product and room photos (about 30, IDs listed in `src/lib/stock-photos.ts`) | [Unsplash](https://unsplash.com), free under the Unsplash License, searched with the "free" license filter on Nov 14, 2026; hotlinked from Unsplash's CDN | Fill empty photo slots in patient apps (treatments, skincare, packages, home hero, About). Matched to the treatment type, never before/after results. The app footer says "Some photos are stock images" and the treatment page labels them "Stock photo". |
| Clinic logos, photos and menus in preview apps | The spa's own public website, read by the owner funnel | That spa's private preview only, labeled "Preview · not live yet" |

## Services

| Name | What it does here |
|---|---|
| [Supabase](https://supabase.com) | Postgres, Auth, Storage, Row Level Security |
| [pg_cron](https://github.com/citusdata/pg_cron) (PostgreSQL License) + [pg_net](https://github.com/supabase/pg_net) (Apache-2.0), Supabase extensions | Hourly call that deletes scan photos past their 72-hour window |
| [Vercel Cron](https://vercel.com/docs/cron-jobs) | Daily backup call of the same photo cleanup |
| [Vercel](https://vercel.com) | Hosting and deploys |

## Tools used for the pitch graphics (not shipped in the app)

| Name | License | What it does here |
|---|---|---|
| [Blender](https://www.blender.org) 5.3 | GPL-2.0-or-later | Renders the animated "time on the phone by generation" donut chart (`video/phone-time-donut/`), built entirely by a Python script; Eevee, H.264 out |
| [FFmpeg](https://ffmpeg.org) 9 (Gyan.dev build) | LGPL-2.1-or-later / GPL-2.0-or-later | Turns the rendered loop into a GIF; also used earlier for the interview brief and the logo cut-out |
| [OpenCV](https://opencv.org) 5.0 (`opencv-python-headless`) | Apache-2.0 | Demo video only (edit pipeline outside the repo): finds and blurs MedSpa SLO's logo, name and address in the 3D app shots, frame by frame |
| Segoe UI (Windows system font) | Microsoft, bundled with Windows | Type in that render; nothing is redistributed |
| Data: [reviews.org](https://www.reviews.org) survey of daily phone time by generation | — | The four numbers shown in the chart, credited on screen |

## AI tools used to build

| Tool | What it did |
|---|---|
| Claude (Anthropic), Claude Code in the Claude desktop app | Wrote the code, SQL, copy and docs from the team's briefs; set up Supabase and Vercel through connectors |

## AI models used by the product (API calls; pick finalized after the Phase 1 bake-off)

| Model | Provider | What it does here |
|---|---|---|
| MediaPipe Face Landmarker (float16) | Google, on-device | Live 3D face mesh, quality gates, zone masks |
| YouCam AI Skin Simulation, AI Face Lift, AI Face Reshape (v2.0) | Perfect Corp (same key as the scan, server-side only) | Default "after" preview: each treatment kind maps to one simulator at a fixed strength (wrinkles, texture and pores, spots and redness, radiance, eye bags and dark circles; cheek and mouth lift; lip size). Our zone mask and dose slider still decide what changes. The prompted image models stay as fallback and in the preview's model picker. |
| sharp 0.35.5 | Apache-2.0 | Server-side padding and cropping of a photo when the skin simulator rejects a tight close-up |
| YouCam AI Skin Analysis v2.1 | Perfect Corp (paid API, bearer key, server-side only) | Default skin scorer when its key is set: 12 measured concern scores (wrinkles, firmness, pores, texture, hydration, dark circles, eye bags, tear troughs, spots, radiance, redness, breakouts) plus the scanner's traced overlays shown on the results screen. Vision models remain as fallback and in the model picker. |
| gemini-3.5-flash (default), gemini-3-flash-preview, gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.1-pro-preview | Google | Skin analysis (JSON schema) with an automatic fallback chain; owner funnel site reading and menu extraction |
| gemini-3.1-flash-lite, gemini-3.5-flash-lite | Google | Owner funnel type-ahead: proposes med spas matching what the owner types. Every proposal is checked by loading the spa's website before it is shown. |
| gpt-6.1-terra | OpenAI | Skin analysis option in the tester model picker (needs credits) |
| gemini-nano-banana-2.1 | Google | After-simulation candidate (prompt-only edit, our mask composites) |
| FLUX Kontext [pro], FLUX.1 Fill [pro] | Black Forest Labs via fal.ai | After-simulation candidates (reference edit; masked inpaint) |
| gpt-image-2.5-sunburst | OpenAI | After-simulation candidate (alpha-mask edit) |
