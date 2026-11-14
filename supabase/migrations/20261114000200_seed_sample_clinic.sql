-- Facet · sample clinic seed
-- One obviously fictional clinic, flagged is_sample = true and labeled "Sample clinic" in the UI.
-- Excluded from every proof count. Prices are typical US med spa list prices (Nov 2026),
-- rounded; result_days is the typical duration before a touch-up is due.

insert into public.clinics (slug, name, brand_color, phone, address, website, booking_url, is_sample)
values (
  'sample',
  'Sample Aesthetics',
  '#92191c',
  '(805) 555-0100',
  '123 Example St, San Luis Obispo, CA 93401',
  'https://example.com',
  'https://example.com/book',
  true
)
on conflict (slug) do nothing;

with c as (select id from public.clinics where slug = 'sample')
insert into public.treatments
  (clinic_id, name, description, price_cents, member_price_cents, concerns, zones, result_days, sort)
select c.id, t.name, t.description, t.price_cents, t.member_price_cents, t.concerns, t.zones, t.result_days, t.sort
from c, (values
  (
    'Neurotoxin (Botox / Dysport)',
    'Relaxes the muscles that fold the skin, softening forehead lines, frown lines and crow''s feet. Results show in 5 to 14 days.',
    48000, 42000,
    array['forehead_lines','frown_lines','crows_feet'],
    array['forehead','glabella','crows_feet_left','crows_feet_right'],
    100, 1
  ),
  (
    'Lip filler',
    'Hyaluronic acid filler for volume, definition and symmetry. Subtle to full, your call.',
    75000, 67500,
    array['lip_volume','lip_definition'],
    array['lips'],
    270, 2
  ),
  (
    'Under-eye filler',
    'Fills the tear trough to soften hollows and the shadows that read as dark circles.',
    90000, 81000,
    array['dark_circles','under_eye_hollows'],
    array['under_eye_left','under_eye_right'],
    365, 3
  ),
  (
    'Cheek filler',
    'Restores mid-face volume and lift, which also softens nasolabial folds.',
    95000, 85500,
    array['volume_loss','sagging','nasolabial_folds'],
    array['cheek_left','cheek_right'],
    450, 4
  ),
  (
    'Microneedling',
    'Tiny controlled channels trigger collagen. Improves texture, pores, fine lines and acne scars over a series.',
    35000, 29500,
    array['texture','pores','fine_lines','acne_scars'],
    array['full_face'],
    45, 5
  ),
  (
    'Chemical peel',
    'Medical-grade peel for uneven tone, dullness, sun damage and breakouts. Light peeling for 3 to 5 days.',
    22500, 19000,
    array['pigmentation','uneven_tone','dullness','acne'],
    array['full_face'],
    35, 6
  ),
  (
    'IPL photofacial',
    'Light-based treatment for sun spots, redness and broken capillaries. Best in a series of three.',
    45000, 38000,
    array['pigmentation','redness','sun_damage'],
    array['full_face'],
    365, 7
  ),
  (
    'Laser resurfacing',
    'Fractional laser for deeper lines, texture and scarring. A week of downtime, months of results.',
    150000, 135000,
    array['fine_lines','texture','acne_scars','pigmentation'],
    array['full_face'],
    540, 8
  ),
  (
    'Signature hydrating facial',
    'Deep cleanse, gentle exfoliation, extractions and a hydration infusion. Glow for the week, no downtime.',
    22500, 18500,
    array['hydration','dullness','pores'],
    array['full_face'],
    30, 9
  ),
  (
    'Medical-grade skincare plan',
    'A prescription-strength routine (retinoid, antioxidant, SPF) chosen from your scan. Refills every 90 days.',
    18000, 15000,
    array['uneven_tone','fine_lines','acne','dullness'],
    array['full_face'],
    90, 10
  )
) as t(name, description, price_cents, member_price_cents, concerns, zones, result_days, sort)
where not exists (
  select 1 from public.treatments x where x.clinic_id = c.id and x.name = t.name
);
