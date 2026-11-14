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
| [Inter](https://fonts.google.com/specimen/Inter) | OFL-1.1 | UI sans |

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
| gpt-6.1-terra | OpenAI | Skin analysis: concern scores, insight, treatment match (strict JSON) |
| gemini-nano-banana-2.1 | Google | After-simulation candidate (prompt-only edit, our mask composites) |
| FLUX Kontext [pro], FLUX.1 Fill [pro] | Black Forest Labs via fal.ai | After-simulation candidates (reference edit; masked inpaint) |
| gpt-image-2.5-sunburst | OpenAI | After-simulation candidate (alpha-mask edit) |
