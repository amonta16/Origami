# Design reference (disclosed)

Facet's visual design is derived from the team's prior product, the Atlas med spa app, which Atlas Engine built and ran before this hackathon. **No code, components, assets, copy files or data from that product are used in Facet.** These stills are the only thing that crossed over: they were captured as a screen recording on Sat Nov 14, 2026 at 12:34 AM and used as a visual reference for palette, type, spacing and component shapes while every screen in Facet was written fresh in this repo.

## Why this is allowed, and how it's disclosed

- The hackathon guide's rules restrict pre-written **code and projects**, and the guide says Discord wins where it says something different. Organizers answered in `#help` on Fri Nov 13, 2026 (11:38 PM and 11:41 PM): restyling from our old app is fine as long as the code is rebuilt fresh in one repo from Friday and the submission notes it. Screenshots as reference were explicitly OK'd.
- Disclosure lives in three places: `README.md` ("Provenance"), this file, and the submission description (`SUBMISSION.md`).
- The organizer thread screenshot goes in this folder as `discord-ruling.png` when the team adds it.

## What the stills show

`stills/` holds 21 frames from the recording, 1280×720. Frames that showed patient names or contact details were excluded; one frame that slipped through (a monthly report with a patient's name) was deleted before the first commit. The only person visible by name is a team member.

| File | Screen (old product) | Facet equivalent |
|---|---|---|
| desk-01-home-setup | Front desk home: greeting, three setup cards, 7-step checklist with progress, access card, help video | `/dashboard` home (Phase 4) |
| desk-02-insights | Live insights: KPI tiles, social proof row, 12-week bar chart, visits by weekday, three stat cards | `/dashboard` numbers (Phase 4), `/admin/proof` (Phase 5) |
| desk-03-check-in-empty | Check-in: phone/code search, Scan QR, empty state | `/dashboard/check-in` (Phase 4, COULD) |
| desk-05-app-builder-journey | App Builder › Journey: tab row + segmented sub-tabs, phone preview, occasion list with toggles | `/dashboard/treatments` patterns; offers are Phase 5 COULD |
| desk-06-app-builder-campaigns | Campaigns hero banner + offer cards | not planned |
| desk-07-app-builder-automations | Automations list with toggles | recall automation UI (Phase 4 "Due") |
| desk-08-treatments | Treatment menu list: monogram, meta line, brand-colored toggles, black "Add treatment" | `/dashboard/treatments` (Phase 4) |
| desk-09-shop-builder | Shop builder: toggle rows, segmented filters, item list | shop is Phase 5 COULD |
| desk-10-ai-skin-scan-setting | AI skin scan setting: description, toggle, three value cards | `/dashboard/settings` scanner section (Phase 4) |
| desk-11-rewards | Rewards catalog: two photo cards, black Edit | rewards (Phase 5) |
| desk-12-reward-edit-modal | Edit reward modal: photo, fields, black save | shared modal/sheet pattern |
| desk-13-brand-settings | Brand settings: name, brand color hex, logo, app icon, home photo | `/dashboard/settings` (Phase 4), owner funnel preview (Phase 2) |
| app-01-home-hero | Patient home: clinic logo bar with search/bag, hero photo with greeting, points pill, "Popular right now" grid, 5-tab bar | `/s/[clinic]` landing (Phase 3) |
| app-02-home-scan-card | Skin-scan card: photo with concern pills ("Fine lines 90"), brand gradient panel, eyebrow, headline, white pill CTA | `/s/[clinic]` hero and results annotations |
| app-03-home-scan-card-map | Same card plus map/location block | landing footer (Phase 3) |
| app-04-shop | Shop: tabs, dark promo banner, category icons, product grid | Phase 5 COULD |
| app-05-shop-packages | Packages / skincare / gift cards sections | Phase 5 COULD |
| app-06-treatment-detail | Treatment card: chip, title, blurb, meta, price line | treatment cards on results (Phase 1) |
| app-07-check-in-code | QR + 6-digit code, black pill CTA | My plan check-in (Phase 5 COULD) |
| app-08-rewards | Points card (bronze gradient), ready-to-use row, locked reward cards | My plan rewards (Phase 5) |
| app-09-profile | Profile list rows with chevrons, legal links | My plan (Phase 3) |

## Second recording (Sat Nov 14, 2026, 4:41 AM)

The team recorded a second, 58-second clip of the old product's **owner preview page**, the page an owner saw after the old app was generated for their spa: their app running inside a phone frame on the left, the pitch on the right. Twelve stills from it are in `stills/preview-*.jpg`. Same rules as above: design reference only, no patient names or contact details, and the frame with a close-up face was left out.

| File | Shows | Facet equivalent |
|---|---|---|
| preview-01-pitch-home-gift | Pitch layout + phone frame; app home with hero, points pill, "A gift for you" wrapped card | `/p/[slug]` preview page; `/s/[clinic]` home + `GiftCard` |
| preview-02-gift-opened | The gift unwrapped, claim button | `GiftCard` (scratch to unwrap, then claim) |
| preview-03-member-promo-rewards | Member promo card and rewards row on home | home: member promo, rewards row |
| preview-04-rewards-row-next-visit | Rewards row, "Book your next visit", treatment explainers | home: next visit row, explainer cards |
| preview-05-about-map | About us, map, address | home: about + map |
| preview-06-shop-browse | Shop browse: banner, category icons, photo grid | `/s/[clinic]/shop` |
| preview-07-treatment-detail | Treatment page with Back, chip, meta, Book now | `/s/[clinic]/t/[id]` |
| preview-08-memberships-tab | Memberships tab card grid | `/s/[clinic]/shop?tab=memberships` |
| preview-09-membership-detail | Membership page: benefits, tiles, subscribe | `/s/[clinic]/m/[id]` |
| preview-10-rewards-guest | Guest points card with Sign in | `/s/[clinic]/rewards` |
| preview-11-earn-points | "Need more points?" rows with point pills | rewards: ways to earn |
| preview-12-profile-guest | Guest profile: sign in card, rows, legal links | `/s/[clinic]/profile` |

Deliberately **not** carried over from that page: the launch-bonus countdown timer, the "N med spas built their app this week" counter and the review strip. Facet has no real numbers behind those yet, so it doesn't show them. The Klarna banner is also left out (no financing integration).

The old product generated its preview from a sales team's setup. Facet's owner funnel is new: an owner types their spa, Facet verifies the official website, reads it, and builds the preview in about 15 seconds with a live build animation.

## What was taken from the reference (design only)

- **Palette:** white surfaces on a very light gray page, near-black text, gray secondary text, hairline borders. One clinic **brand color** does all the accent work: primary "Scan QR" button, active nav marker, tab underline, toggles, progress and chart bars. Primary actions are otherwise **black pills**; secondary actions are white pills with a border. A soft pink tint of the brand color backs the help box and selected rows.
- **Type:** a clean sans for everything (headings at semibold, tight tracking). The emailed monthly report uses a serif for its headline; Facet keeps a serif only for that kind of editorial moment.
- **Shapes:** 14–16 px card radius, pill buttons and chips, segmented control sub-tabs (gray track, white active pill), brand-colored toggles, monogram avatars.
- **Patient app chrome:** top bar with clinic logo and two icons; floating 5-tab bottom bar (home, shop, scan, rewards, profile).
- **Scan card idiom:** photo with floating concern pills and a brand gradient panel underneath.

## What was not taken

- No source code, no components, no CSS, no icons, no fonts files, no images, no copy decks.
- The clinic logo and photos visible in the stills belong to that clinic and appear only inside the reference frames; Facet does not use them anywhere.
- The reference app's AI skin scan flow itself was not recorded and is not referenced; Facet's scan (live mesh, zones, masked after-simulation, dose slider) is new in concept and in code.
