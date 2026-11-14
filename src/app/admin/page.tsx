import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { LeadEditor } from "@/components/admin/lead-editor";
import { Empty, Funnel, LinkPill, SampleTag, Section, Tag, TeamTestTag } from "@/components/admin/parts";
import { adminConfigured, adminPassword, isAdmin } from "@/lib/admin/auth";
import { hostOf, loadAdminData, pacific, type AdminClinic } from "@/lib/admin/data";
import { isTeamTestSlug } from "@/lib/admin/exclusions";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Team-only admin: owner leads, built apps, funnel, recent activity. */
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 md:px-8">
      <Suspense fallback={<p className="text-[14px] text-ink-muted">Loading…</p>}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Gate({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  if (!adminPassword()) {
    return (
      <Card>
        <h1 className="font-display text-[20px]">Admin is locked</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">Set ADMIN_PASSWORD in the Vercel project to unlock the admin.</p>
      </Card>
    );
  }
  if (!adminConfigured()) {
    return (
      <Card>
        <h1 className="font-display text-[20px]">Admin is locked</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">Set ADMIN_SESSION_SECRET (or SUPABASE_SECRET_KEY) so the admin can sign its session cookie.</p>
      </Card>
    );
  }
  if (!(await isAdmin())) {
    const err = sp.error === "slow" ? "Too many tries. Wait 15 minutes." : sp.error ? "That password didn't match." : null;
    return (
      <Card>
        <h1 className="font-display text-[20px]">Facet admin</h1>
        <p className="mt-1 text-[13px] text-ink-muted">Team only.</p>
        <form method="post" action="/api/admin/login" className="mt-5 flex flex-col gap-3">
          <label htmlFor="admin-pw" className="text-[13px] font-medium text-ink-soft">
            Password
          </label>
          <input
            id="admin-pw"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-11 rounded-field border border-line bg-surface px-3.5 text-[14px] focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/10"
          />
          {err && (
            <p role="alert" className="rounded-field bg-sev-pronounced-soft px-3 py-2 text-[13px] text-danger">
              {err}
            </p>
          )}
          <button type="submit" className="mt-1 inline-flex h-11 items-center justify-center rounded-chip bg-ink px-5 text-[14px] font-medium text-white hover:bg-ink-soft">
            Sign in
          </button>
        </form>
      </Card>
    );
  }
  return <Dashboard includeSample={sp.sample === "1"} />;
}

function Card({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-16 w-full max-w-sm rounded-card border border-line bg-surface p-7 shadow-soft">{children}</div>;
}

function ClinicTags({ clinic }: { clinic: AdminClinic | null }) {
  if (!clinic) return null;
  return (
    <>
      {clinic.is_sample && <SampleTag />}
      {isTeamTestSlug(clinic.slug) && <TeamTestTag />}
    </>
  );
}

async function Dashboard({ includeSample }: { includeSample: boolean }) {
  const d = await loadAdminData({ includeSample });

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <h1 className="font-display text-[26px]">Admin</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Team only. Times are Pacific. Public numbers live at <Link href="/proof" className="font-medium text-ink underline underline-offset-2">/proof</Link>.</p>
        </div>
        <form method="post" action="/api/admin/logout">
          <button type="submit" className="inline-flex h-9 items-center rounded-chip border border-line-strong bg-surface px-4 text-[13px] font-medium hover:border-ink">
            Sign out
          </button>
        </form>
      </header>

      {!d ? (
        <Section title="Database not connected">
          <Empty>Once Supabase is configured on this server, the admin fills in.</Empty>
        </Section>
      ) : (
        <div className="flex flex-col gap-4">
          <Section title="Owner leads" description={`${d.leads.length} owner${d.leads.length === 1 ? "" : "s"} asked for a call. Newest first.`}>
            {d.leads.length === 0 ? (
              <Empty>No owner has asked for a call yet.</Empty>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-[13px]">
                  <thead className="text-[11px] text-ink-muted">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">Spa</th>
                      <th className="pb-2 pr-3 font-medium">Contact</th>
                      <th className="pb-2 pr-3 font-medium">Reach</th>
                      <th className="pb-2 pr-3 font-medium">Best time</th>
                      <th className="pb-2 pr-3 font-medium">When</th>
                      <th className="pb-2 pr-3 font-medium">Links</th>
                      <th className="pb-2 font-medium">Stage &amp; notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line align-top">
                    {d.leads.map((l) => (
                      <tr key={l.id}>
                        <td className="py-3 pr-3">
                          <span className="flex flex-wrap items-center gap-1.5 font-medium">
                            {l.spa_name}
                            <ClinicTags clinic={l.clinic} />
                          </span>
                          {hostOf(l.website) && <span className="block text-[12px] text-ink-muted">{hostOf(l.website)}</span>}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="block">{l.contact_name || "—"}</span>
                          {l.role && <span className="block text-[12px] text-ink-muted">{l.role}</span>}
                        </td>
                        <td className="py-3 pr-3">
                          {l.email && (
                            <a href={`mailto:${l.email}`} className="block hover:underline">
                              {l.email}
                            </a>
                          )}
                          {l.phone && (
                            <a href={`tel:${l.phone}`} className="block tabular-nums hover:underline">
                              {l.phone}
                            </a>
                          )}
                          {!l.email && !l.phone && "—"}
                        </td>
                        <td className="py-3 pr-3">{l.best_time || "—"}</td>
                        <td className="whitespace-nowrap py-3 pr-3 text-ink-soft">{pacific(l.created_at)}</td>
                        <td className="py-3 pr-3">
                          {l.clinic ? (
                            <span className="flex flex-wrap gap-1.5">
                              <LinkPill href={`/p/${l.clinic.slug}`}>Preview</LinkPill>
                              <LinkPill href={`/desk/${l.clinic.slug}`}>Desk</LinkPill>
                            </span>
                          ) : (
                            <span className="text-ink-muted">No app</span>
                          )}
                        </td>
                        <td className="py-3">
                          <LeadEditor id={l.id} stage={l.stage} notes={l.notes} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Apps built" description="Preview apps generated by the owner funnel, newest first. Patients = people who joined that app; scans = scan rows saved.">
            {d.apps.length === 0 ? (
              <Empty>No preview apps built yet.</Empty>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[13px]">
                  <thead className="text-[11px] text-ink-muted">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">Clinic</th>
                      <th className="pb-2 pr-3 font-medium">Source site</th>
                      <th className="pb-2 pr-3 font-medium">Built</th>
                      <th className="pb-2 pr-3 text-right font-medium">Treatments</th>
                      <th className="pb-2 pr-3 text-right font-medium">Patients</th>
                      <th className="pb-2 pr-3 text-right font-medium">Scans</th>
                      <th className="pb-2 font-medium">Links</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {d.apps.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-3">
                          <span className="flex flex-wrap items-center gap-1.5 font-medium">
                            {a.name}
                            <ClinicTags clinic={a} />
                          </span>
                          <span className="block font-mono text-[11px] text-ink-muted">{a.slug}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-ink-soft">{hostOf(a.source_url) ?? hostOf(a.website) ?? "—"}</td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-ink-soft">{pacific(a.built_at ?? a.created_at)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.treatments}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.patients}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{a.scans}</td>
                        <td className="py-2.5">
                          <span className="flex flex-wrap gap-1.5">
                            <LinkPill href={`/p/${a.slug}`}>Preview</LinkPill>
                            <LinkPill href={`/desk/${a.slug}`}>Desk</LinkPill>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            title="Funnel"
            description={includeSample ? "Event counts, including the fictional Sample clinic." : "Event counts. Events from the fictional Sample clinic are left out; team test builds are still counted here (tagged in the tables)."}
            action={
              <Link
                href={includeSample ? "/admin" : "/admin?sample=1"}
                className="inline-flex h-9 items-center gap-2 rounded-chip border border-line-strong bg-surface px-4 text-[13px] font-medium hover:border-ink"
                aria-pressed={includeSample}
              >
                <span className={`size-2 rounded-full ${includeSample ? "bg-ink" : "bg-line-strong"}`} aria-hidden="true" />
                {includeSample ? "Including sample" : "Include sample"}
              </Link>
            }
          >
            <h3 className="mt-5 text-[13px] font-semibold">Owners</h3>
            <Funnel steps={d.ownerFunnel} />
            <h3 className="mt-6 text-[13px] font-semibold">Patients</h3>
            <Funnel steps={d.patientFunnel} />
            <p className="mt-3 text-[12px] text-ink-muted">Counts are events, not unique people. &ldquo;Tapped book&rdquo; and &ldquo;Joined&rdquo; both follow the after-preview.</p>
          </Section>

          <Section title="Recent activity" description="Last 50 events, all clinics.">
            {d.activity.length === 0 ? (
              <Empty>No events yet.</Empty>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {d.activity.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                    <span className="w-[150px] shrink-0 whitespace-nowrap text-ink-muted tabular-nums">{pacific(e.created_at)}</span>
                    <Tag tone="outline">{e.name}</Tag>
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-ink-soft">
                      {e.clinic?.name ?? <span className="text-ink-muted">No clinic</span>}
                      <ClinicTags clinic={e.clinic} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </>
  );
}
