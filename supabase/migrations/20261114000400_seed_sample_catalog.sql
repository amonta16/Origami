-- Facet · sample clinic catalog (shop, memberships, rewards)
-- Only for the fictional "Sample Aesthetics" clinic (is_sample = true, labeled "Sample clinic" in the UI).
-- Names, copy and prices are written for Facet; prices are rounded typical US med spa list prices.

with c as (select id from public.clinics where slug = 'sample')
update public.treatments t set
  category = v.category::public.treatment_category,
  duration_min = v.duration_min,
  popular = v.popular
from c, (values
  ('Neurotoxin (Botox / Dysport)', 'injectables', 30, true),
  ('Lip filler', 'injectables', 45, true),
  ('Under-eye filler', 'injectables', 45, false),
  ('Cheek filler', 'injectables', 45, false),
  ('Microneedling', 'skin', 60, true),
  ('Chemical peel', 'skin', 45, false),
  ('IPL photofacial', 'laser', 45, false),
  ('Laser resurfacing', 'laser', 90, false),
  ('Signature hydrating facial', 'skin', 60, true),
  ('Medical-grade skincare plan', 'consult', 30, false)
) as v(name, category, duration_min, popular)
where t.clinic_id = c.id and t.name = v.name;

with c as (select id from public.clinics where slug = 'sample')
insert into public.products (clinic_id, kind, name, description, price_cents, member_price_cents, sessions, sort)
select c.id, v.kind::public.product_kind, v.name, v.description, v.price_cents, v.member_price_cents, v.sessions, v.sort
from c, (values
  ('package', 'Microneedling series', 'Three sessions four weeks apart, the schedule that actually moves texture and scarring.', 90000, 79500, 3, 1),
  ('package', 'Clear-skin peel series', 'Four peels, one every three weeks, for tone, breakouts and dullness.', 76000, 68000, 4, 2),
  ('package', 'IPL photofacial series', 'Three light treatments for sun spots and redness, spaced a month apart.', 115000, 99000, 3, 3),
  ('package', 'Facial of the month', 'Six hydrating facials to use whenever you like within a year.', 120000, 99000, 6, 4),
  ('skincare', 'Mineral sunscreen SPF 46', 'Sheer zinc oxide that wears well under makeup. The one product everyone should own.', 4400, 3960, null, 1),
  ('skincare', 'Vitamin C serum', 'A 15% L-ascorbic acid morning serum for brightness and antioxidant protection.', 16900, 15200, null, 2),
  ('skincare', 'Retinol 0.5 night cream', 'Gentle starter retinol for fine lines and texture. Use two nights a week at first.', 9800, 8800, null, 3),
  ('skincare', 'Barrier repair moisturizer', 'Ceramides and niacinamide for skin that feels tight after treatments.', 6200, 5600, null, 4),
  ('gift_card', 'Gift card · $100', 'Good for any treatment or product. Never expires.', 10000, null, null, 1),
  ('gift_card', 'Gift card · $250', 'Good for any treatment or product. Never expires.', 25000, null, null, 2),
  ('gift_card', 'Gift card · $500', 'Good for any treatment or product. Never expires.', 50000, null, null, 3)
) as v(kind, name, description, price_cents, member_price_cents, sessions, sort)
where not exists (select 1 from public.products p where p.clinic_id = c.id and p.name = v.name);

with c as (select id from public.clinics where slug = 'sample')
insert into public.membership_plans (clinic_id, name, tagline, monthly_price_cents, perks, member_discount_pct, monthly_points, sort)
select c.id, v.name, v.tagline, v.price, v.perks, v.pct, v.pts, v.sort
from c, (values
  ('Glow', 'A facial every month and member prices on everything else.', 9900,
    array['One signature hydrating facial every month', '10% off treatments and skincare', '100 bonus points each month', 'Unused facials roll over for 90 days'], 10, 100, 1),
  ('Smooth', 'For neurotoxin regulars: your touch-ups, budgeted.', 17900,
    array['20 units of neurotoxin every quarter', 'One hydrating facial every month', '15% off filler, lasers and skincare', '200 bonus points each month'], 15, 200, 2),
  ('Renew', 'Our full plan for skin you are actively changing.', 29900,
    array['One microneedling or peel every month', 'Neurotoxin touch-ups every quarter', '20% off everything else', '300 bonus points each month', 'Priority booking'], 20, 300, 3)
) as v(name, tagline, price, perks, pct, pts, sort)
where not exists (select 1 from public.membership_plans m where m.clinic_id = c.id and m.name = v.name);

with c as (select id from public.clinics where slug = 'sample')
insert into public.rewards (clinic_id, name, description, points_cost, sort)
select c.id, v.name, v.description, v.cost, v.sort
from c, (values
  ('Free LED add-on', 'Add ten minutes of LED light therapy to any facial or peel.', 150, 1),
  ('$25 off any treatment', 'Take $25 off your next visit, any treatment.', 300, 2),
  ('Free signature facial', 'One 60-minute hydrating facial on us.', 1200, 3),
  ('20 units of neurotoxin', 'Twenty units, enough for most frown-line treatments.', 3000, 4)
) as v(name, description, cost, sort)
where not exists (select 1 from public.rewards r where r.clinic_id = c.id and r.name = v.name);
