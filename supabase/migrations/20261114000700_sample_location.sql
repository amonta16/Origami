-- Facet · sample clinic gets a real place on the map (Sat Nov 14 2026, team request).
-- "Sample Aesthetics" is still fictional and flagged is_sample = true. The location is a public
-- street intersection in downtown Santa Barbara, not any business's address, so the map shows
-- a real neighborhood without pointing at a real spa. Photos come from the stock fill in
-- src/lib/stock-photos.ts (labeled as stock in the app).

update public.clinics
set
  address = 'State St & Canon Perdido St, Santa Barbara, CA 93101',
  city = 'Santa Barbara'
where slug = 'sample' and is_sample = true;
