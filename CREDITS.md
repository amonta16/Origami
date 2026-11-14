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
| [Caveat](https://fonts.google.com/specimen/Caveat) | OFL-1.1 | Handwritten "For you" tag on the welcome gift |

## Images

| Image | Source and license | Where |
|---|---|---|
| "A woman with dark hair" (photo-1652226825940-46ad2a55d132) | [Unsplash](https://unsplash.com/photos/a-woman-with-dark-hair-0NDVW4wO1Ms), free under the Unsplash License; hotlinked from Unsplash's CDN | Example face on the skin-analysis card and the scan consent screen, labeled "Example photo · Unsplash". Landmarks measured with MediaPipe in the browser. |
| Clinic logos, photos and menus in preview apps | The spa's own public website, read by the owner funnel | That spa's private preview only, labeled "Preview · not live yet" |

## Services

| Name | What it does here |
|---|---|
| [Supabase](https://supabase.com) | Postgres, Auth, Storage, Row Level Security |
| [Vercel](https://vercel.com) | Hosting and deploys |

## AI tools used to build

| Tool | What it did |
|---|---|
| Claude (Anthropic), Claude Code in the Claude desktop app | Wrote the code, SQL, copy and docs from the team's briefs; set up Supabase and Vercel through connectors |

## AI models used by the product (API calls; pick finalized after the Phase 1 bake-off)

| Model | Provider | What it does here |
|---|---|---|
| MediaPipe Face Landmarker (float16) | Google, on-device | Live 3D face mesh, quality gates, zone masks |
| gemini-3.5-flash (default), gemini-3-flash-preview, gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.1-pro-preview | Google | Skin analysis (JSON schema) with an automatic fallback chain; owner funnel site reading and menu extraction |
| gpt-6.1-terra | OpenAI | Skin analysis option in the tester model picker (needs credits) |
| gemini-nano-banana-2.1 | Google | After-simulation candidate (prompt-only edit, our mask composites) |
| FLUX Kontext [pro], FLUX.1 Fill [pro] | Black Forest Labs via fal.ai | After-simulation candidates (reference edit; masked inpaint) |
| gpt-image-2.5-sunburst | OpenAI | After-simulation candidate (alpha-mask edit) |
