/**
 * Clinics the public proof page never counts, on top of every `is_sample` clinic.
 *
 * TEAM_TEST_CLINIC_SLUGS are the team's own test builds: preview apps we generated
 * ourselves on Sat Nov 14, 2026 while testing the owner funnel against the "MedSpa SLO"
 * website. They are real rows in the database but not real customers, so counting them
 * as weekend proof would be dishonest. Add a slug here whenever the team builds another
 * test app. `med-spa-slo-97zh` was found in the database with the same test pattern and
 * is listed for the same reason.
 */
export const TEAM_TEST_CLINIC_SLUGS: readonly string[] = [
  "med-spa-slo-qnnf",
  "med-spa-slo-96ag",
  "med-spa-slo-2dr6",
  "med-spa-slo-97zh",
  // built by Claude by accident while testing the type-ahead on dev (Sat Nov 14, 11:23 AM PT)
  "skin-deep-medical-spa-3gx9",
];

/** Fri Nov 13, 2026, 5:00 PM Pacific (PST, UTC-8): the hackathon start. */
export const WEEKEND_START_ISO = "2026-11-14T01:00:00.000Z";
/** Sun Nov 15, 2026, 12:00 PM Pacific: submissions close. Used for the chart window. */
export const WEEKEND_END_ISO = "2026-11-15T20:00:00.000Z";

export function isTeamTestSlug(slug: string) {
  return TEAM_TEST_CLINIC_SLUGS.includes(slug);
}
