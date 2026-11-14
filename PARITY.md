# Screen parity

Every screen Facet has or will have this weekend, where it comes from, and what it is matched to. "Rebuilt from phase prompt" means the screen is specified by the team's build plan and designed from that spec. "Matched to reference" means its layout and visual language follow a still in `reference/stills/` (design only; all code new). Many screens are both: the spec defines what they do, the reference defines how they look.

Status: ✅ built · 🛠 in progress · ⏳ planned

| # | Route / screen | Source of spec | Visual basis | Reference still(s) | Status |
|---|---|---|---|---|---|
| 1 | `/` marketing home + "type your spa" input | Phase 2 prompt | Rebuilt from phase prompt (no equivalent in old product) | — | 🛠 placeholder |
| 2 | `/styleguide` | Phase 0 prompt | Tokens matched to reference palette/type | desk-01, app-01 | ✅ retuned |
| 3 | `/s/[clinic]` patient landing | Phase 3 prompt | Matched to reference | app-01-home-hero, app-02-home-scan-card | ✅ |
| 4 | `/s/[clinic]/scan` consent | Phase 1 prompt | Matched to reference (white, black pill, brand checkbox) | app-09-profile (list idiom) | ✅ |
| 5 | `/s/[clinic]/scan` live mesh capture | Phase 1 prompt + face-scan tech plan | Rebuilt from phase prompt (no equivalent) | — | ✅ |
| 6 | `/s/[clinic]/scan` analyzing | Phase 1 prompt | Rebuilt from phase prompt | — | ✅ |
| 7 | `/s/[clinic]/scan` results: score, heat map with concern pills, concern cards, matched treatments | Phase 1 prompt | Matched to reference for cards, pills and CTAs; score/mesh/heat map new | app-02-home-scan-card, app-06-treatment-detail | ✅ |
| 8 | After-simulation sheet: before/after + dose slider | Phase 1 prompt + tech plan | Rebuilt from phase prompt (no equivalent) | — | ✅ |
| 9 | `/lab` bake-off (internal) | Phase 1 prompt | Rebuilt from phase prompt | — | ✅ |
| 10 | 5 quick questions | Phase 3 prompt | Rebuilt from phase prompt (chip idiom from reference) | app-06 (chips) | ⏳ |
| 11 | Reveal / contact capture | Phase 3 prompt | Rebuilt from phase prompt | — | ⏳ |
| 12 | Book: sticky bar + sheet | Phase 3 prompt | Matched to reference (black pill CTA, bottom sheet) | app-07-check-in-code | ⏳ |
| 13 | `/s/[clinic]/profile` Profile: card, points + membership tiles, check-in code, text reminders, add to home screen, call/book, sign out, my requests | Phase 3 + 5 prompts | Matched to reference | app-09-profile | ✅ |
| 13a | `/s/[clinic]/rewards` points card, ready-to-use codes, reward catalog with redeem, ways to earn | Phase 5 prompt | Matched to reference | app-08-rewards | ✅ |
| 13b | `/s/[clinic]/visit` center tab: check-in QR + 6-digit code, link to the AI scan | Phase 5 prompt | Matched to reference | app-07-check-in-code | ✅ |
| 13c | Join sheet (first name, mobile, 18+, optional texts) + signed session cookie | Phase 3 prompt | Rebuilt from phase prompt; sheet idiom from reference | — | ✅ |
| 13d | `/s/[clinic]/legal` terms, privacy, AI face scan notice, California notice | CLAUDE.md safety rules | Rebuilt (plain-language, new copy) | app-09 (legal links row) | ✅ |
| 14 | Owner funnel `/`: type your spa → verified site lookup → streamed "Building your app…" animation | Phase 2 prompt | Rebuilt from phase prompt (new flow; no equivalent recorded) | — | ✅ |
| 14a | `/p/[slug]` owner preview: live app in a phone frame + pitch, "Wrong logo or color? Fix it" | Phase 2 prompt | Matched to reference | preview-01 … preview-12 | ✅ |
| 15 | "Book my free call" form → owner_leads + thank-you | Phase 2 prompt | Rebuilt from phase prompt | preview-01 (button) | ✅ |
| 15a | Results screen "Compare models" + after-image model picker, runs saved, `/lab/runs` | Team request (testers) | New | — | ✅ |
| 16 | `/admin` owner leads, scanners built, funnel events | Phase 2 prompt | Matched to reference (desk list/table idiom) | desk-02-insights | ⏳ |
| 17 | `/admin/proof` weekend proof | Phase 5 prompt | Matched to reference (KPI tiles) | desk-02-insights | ⏳ |
| 18 | `/desk/[clinic]` home: greeting, setup cards, finish-setting-up checklist from real state | Phase 4 prompt | Matched to reference | desk-01-home-setup | ✅ |
| 18a | `/desk/[clinic]/insights` KPI tiles, 12-week chart, weekday bars, stat cards (real counts) | Phase 4 prompt | Matched to reference | desk-02-insights | ✅ |
| 19 | `/desk/[clinic]/clients` searchable list + detail panel | Phase 4 prompt | Rebuilt from phase prompt; desk chrome from reference | desk-03 (chrome) | ✅ (AI first text ⏳) |
| 20 | `/desk/[clinic]/due` overdue / this week / next week + copy recall text | Phase 4 prompt | Rebuilt from phase prompt; list idiom from reference | desk-08 (list) | ✅ (sending ⏳, texting not connected) |
| 21 | `/desk/[clinic]/orders` shop requests: confirm / cancel (membership confirm sets the plan) | Phase 5 prompt | Matched to reference (list + filters) | desk-08 | ✅ |
| 22 | App Builder › Products: treatments, shop items, AI skin scan toggle | Phase 4 prompt | Matched to reference | desk-08-treatments, desk-09-shop-builder, desk-10 | ✅ |
| 22a | App Builder › Membership, Rewards (cards + edit modal), Journey (switches saved only) | Phase 5 prompt | Matched to reference | desk-05, desk-07, desk-11, desk-12 | ✅ |
| 23 | App Builder › Settings: brand, clinic details, points | Phase 4 prompt | Matched to reference | desk-13-brand-settings | ✅ |
| 24 | Desk shell: sidebar nav, header with brand "Scan QR", View app, help box | Phase 4 prompt | Matched to reference | desk-01 … desk-13 | ✅ |
| 25 | `/desk/[clinic]/check-in`: phone / name / code / QR, check in + visit points, mark reward used | Phase 4 prompt | Matched to reference | desk-03, app-07 | ✅ (camera QR untested on a device) |
| 26 | `/s/[clinic]/shop`: Browse (promo banner, category icons, most booked, packages, skincare, gift cards), Memberships (plan cards), Treatments (filter, sort, treatment cards); item sheet with member price and "request" (no payment in app) | Phase 5 prompt | Matched to reference | app-04-shop, app-05-shop-packages, app-06-treatment-detail, preview-06 … preview-09 | ✅ |
| 3 | `/s/[clinic]` home rebuilt: hero + greeting, points pill, AI scan card, "Popular right now" | Phase 3 prompt | Matched to reference | app-01-home-hero, app-02-home-scan-card | ✅ |
