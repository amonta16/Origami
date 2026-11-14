import { Suspense } from "react";
import { PatientShell } from "@/components/patient/patient-shell";
import { loadPatientPage } from "@/lib/patient/load";

export const metadata = { title: "Privacy and terms" };

// Plain-language notices for the patient app. Facet is a student hackathon project; these say
// what the software actually does today, not boilerplate.
export default function LegalPage({ params }: PageProps<"/s/[clinic]/legal">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <Legal params={params} />
    </Suspense>
  );
}

async function Legal({ params }: { params: PageProps<"/s/[clinic]/legal">["params"] }) {
  const { clinic: slug } = await params;
  const { clinic, patient } = await loadPatientPage(slug);

  const sections: Array<{ id: string; title: string; body: string[] }> = [
    {
      id: "terms",
      title: "Terms",
      body: [
        `This app is built by students at the CPVC × OCOB × CPE AI Hackathon (Cal Poly, Nov 13–15, 2026) and is run for ${clinic.name}. It is a demo, offered as is.`,
        "Requests you send from the shop are requests, not purchases. Nothing is charged in the app. The clinic confirms prices, availability and payment with you in person.",
        "Points and rewards are set by the clinic, have no cash value and can't be transferred.",
        "You must be 18 or older to use the app.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      body: [
        `When you join, we store your first name, mobile number, the date you agreed, your points and your requests, for ${clinic.name} only.`,
        "We don't sell or share your information, and we don't use it for advertising.",
        "Text messages are sent only if you turned them on, and you can turn them off on your Profile or by replying STOP.",
        "Signing out removes the sign-in from this phone. To delete your card and data, ask the front desk or the team, and we'll remove it.",
      ],
    },
    {
      id: "face-scan",
      title: "AI face scan notice",
      body: [
        "A selfie is biometric information. We ask for your consent before the camera opens, and the scan only runs if you agree.",
        "The face mesh is computed on your phone. Your photo is sent to our server and an AI provider to estimate cosmetic concerns and draw treatment previews, and for nothing else.",
        "Raw photos are deleted automatically after 72 hours unless you choose to keep them.",
        "Results are cosmetic estimates, not a medical diagnosis. If something looks medical, such as a changing mole, see a doctor.",
      ],
    },
    {
      id: "california",
      title: "California notice",
      body: [
        "California residents have the right to know what personal information we collect, to delete it, to correct it, and to not be discriminated against for asking. We do not sell or share personal information.",
        "Categories we collect: identifiers (first name, mobile number), biometric information (selfie, only with consent, deleted after 72 hours), and commercial information (your requests and points).",
      ],
    },
  ];

  return (
    <PatientShell clinic={clinic} patient={patient} active="profile" title="Privacy and terms">
      <div className="px-5 pt-2">
        <nav aria-label="On this page" className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-chip border border-line-strong px-3 py-1.5 text-[12px] text-ink-soft hover:border-ink">
              {s.title}
            </a>
          ))}
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-4 pt-7">
            <h2 className="font-display text-[18px]">{s.title}</h2>
            <div className="mt-2 flex max-w-prose flex-col gap-2.5 text-[14px] leading-relaxed text-ink-soft">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
        <p className="pt-8 text-[12px] text-ink-muted">Last updated Nov 14, 2026.</p>
      </div>
    </PatientShell>
  );
}
