import { MeshPhoto } from "@/components/patient/scan-card";
import { PLACEHOLDER_FACE as F } from "@/lib/placeholder-face";

/**
 * Looping illustrations for the three landing-page pillars (GIF-like, but CSS/SVG so they stay
 * sharp and light). Everything is drawn for Facet; no customer data, names or numbers.
 * Motion stops under prefers-reduced-motion and the final frame stays readable.
 */

const frame = "relative aspect-[5/4] w-full overflow-hidden rounded-[14px] bg-surface-muted";

/** 1. Your website flows into your app: browser is scanned, its color, photo and menu land in the phone. */
export function SiteToAppArt() {
  return (
    <div className={frame} aria-hidden="true">
      {/* browser */}
      <div className="absolute left-[7%] top-[14%] h-[66%] w-[50%] overflow-hidden rounded-[8px] bg-white shadow-[0_6px_18px_-10px_rgba(17,19,24,.35)]">
        <div className="flex h-[13%] items-center gap-[3%] border-b border-line px-[5%]">
          <span className="size-[5px] rounded-full bg-[#e2e3e7]" />
          <span className="size-[5px] rounded-full bg-[#e2e3e7]" />
          <span className="ml-[4%] h-[45%] flex-1 rounded-full bg-[#f1f2f4]" />
        </div>
        <div className="p-[7%]">
          <span className="block h-[7px] w-[55%] rounded-full bg-[#2f6f5e]" />
          <span className="mt-[6%] block aspect-[16/7] w-full rounded-[5px] bg-[linear-gradient(135deg,#d9c7b8,#b59a86)]" />
          <span className="mt-[7%] block h-[4px] w-[90%] rounded-full bg-[#e4e5e9]" />
          <span className="mt-[5%] block h-[4px] w-[70%] rounded-full bg-[#e4e5e9]" />
          <span className="mt-[5%] block h-[4px] w-[80%] rounded-full bg-[#e4e5e9]" />
        </div>
        <span className="pa1-beam absolute inset-x-0 top-0 h-[22%]" />
      </div>

      {/* phone */}
      <div className="absolute right-[8%] top-[8%] h-[84%] w-[30%] rounded-[14px] border-[3px] border-[#111318] bg-white">
        <div className="absolute inset-0 overflow-hidden rounded-[10px]">
          <span className="pa1-in pa1-d1 absolute inset-x-0 top-0 h-[30%] bg-[#2f6f5e]" />
          <span className="pa1-in pa1-d2 absolute left-[10%] top-[34%] aspect-square w-[37%] rounded-[5px] bg-[linear-gradient(135deg,#d9c7b8,#b59a86)]" />
          <span className="pa1-in pa1-d3 absolute right-[10%] top-[34%] aspect-square w-[37%] rounded-[5px] bg-[linear-gradient(135deg,#c9d6cf,#8fb0a3)]" />
          <span className="pa1-in pa1-d4 absolute left-[10%] top-[66%] h-[4px] w-[60%] rounded-full bg-[#d6d8dd]" />
          <span className="pa1-in pa1-d4 absolute left-[10%] top-[73%] h-[4px] w-[45%] rounded-full bg-[#d6d8dd]" />
          <span className="absolute inset-x-0 bottom-0 flex h-[12%] items-center justify-around border-t border-line">
            <span className="size-[5px] rounded-full bg-[#2f6f5e]" />
            <span className="size-[5px] rounded-full bg-[#d6d8dd]" />
            <span className="size-[5px] rounded-full bg-[#d6d8dd]" />
          </span>
        </div>
      </div>

      {/* pieces in flight */}
      <span className="pa1-fly pa1-f1 absolute left-[14%] top-[24%] size-[10px] rounded-full bg-[#2f6f5e] ring-2 ring-white" />
      <span className="pa1-fly pa1-f2 absolute left-[20%] top-[40%] h-[12%] w-[14%] rounded-[4px] bg-[linear-gradient(135deg,#d9c7b8,#b59a86)] ring-2 ring-white" />
      <span className="pa1-fly pa1-f3 absolute left-[16%] top-[64%] h-[5px] w-[16%] rounded-full bg-[#9a9ca3]" />

      <style>{`
        .pa1-beam { background: linear-gradient(180deg, transparent, color-mix(in oklab, #2f6f5e 28%, transparent), transparent); animation: pa1-beam 5s ease-in-out infinite; }
        @keyframes pa1-beam { 0% { transform: translateY(-30%); opacity: 0; } 8% { opacity: 1; } 40% { transform: translateY(420%); opacity: 1; } 48%, 100% { transform: translateY(420%); opacity: 0; } }
        .pa1-fly { opacity: 0; animation: 5s cubic-bezier(.5,0,.2,1) infinite; }
        .pa1-f1 { animation-name: pa1-f1; } .pa1-f2 { animation-name: pa1-f2; } .pa1-f3 { animation-name: pa1-f3; }
        @keyframes pa1-f1 { 0%, 22% { opacity: 0; transform: none; } 26% { opacity: 1; } 42% { opacity: 1; transform: translate(560%, -60%); } 46%, 100% { opacity: 0; transform: translate(560%, -60%); } }
        @keyframes pa1-f2 { 0%, 30% { opacity: 0; transform: none; } 34% { opacity: 1; } 52% { opacity: 1; transform: translate(330%, -10%) scale(.8); } 56%, 100% { opacity: 0; transform: translate(330%, -10%) scale(.8); } }
        @keyframes pa1-f3 { 0%, 38% { opacity: 0; transform: none; } 42% { opacity: 1; } 60% { opacity: 1; transform: translate(260%, 40%); } 64%, 100% { opacity: 0; transform: translate(260%, 40%); } }
        .pa1-in { opacity: 0; transform: scale(.85); animation: pa1-in 5s cubic-bezier(.2,1.3,.4,1) infinite; }
        .pa1-d1 { animation-delay: 0s; } .pa1-d2 { animation-delay: .5s; } .pa1-d3 { animation-delay: .7s; } .pa1-d4 { animation-delay: 1s; }
        @keyframes pa1-in { 0%, 40% { opacity: 0; transform: scale(.85); } 48%, 92% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .pa1-beam, .pa1-fly { animation: none; opacity: 0; } .pa1-in { animation: none; opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

/** 2. The face scan: the real example photo with its traced mesh, then a finding and a matched treatment. */
export function ScanArt() {
  return (
    <div className={`${frame} bg-[#1b1c20]`} aria-hidden="true">
      <MeshPhoto className="!absolute inset-0 !aspect-auto h-full w-full">
        <span className="absolute left-2.5 top-2.5 rounded-[6px] bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-[0.05em] text-white">SCANNING</span>
        <span className="pa2-pop absolute rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#2a2d34]" style={{ left: `${F.pills.fineLines[0]}%`, top: `${F.pills.fineLines[1]}%` }}>
          Fine lines · mild
        </span>
        <span className="pa2-pop pa2-late absolute bottom-[10%] left-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold text-[#111318] shadow-[0_6px_16px_-6px_rgba(0,0,0,.5)]" style={{ marginLeft: "-62px" }}>
          <span className="size-1.5 rounded-full bg-brand" />
          Matched: Neurotoxin
        </span>
      </MeshPhoto>
      <style>{`
        .pa2-pop { opacity: 0; animation: pa2-pop 4.8s cubic-bezier(.2,1.3,.4,1) infinite; }
        .pa2-late { animation-name: pa2-late; }
        @keyframes pa2-pop { 0%, 30% { opacity: 0; transform: translateY(4px) scale(.9); } 38%, 90% { opacity: 1; transform: none; } 100% { opacity: 0; } }
        @keyframes pa2-late { 0%, 52% { opacity: 0; transform: translateY(6px) scale(.9); } 60%, 90% { opacity: 1; transform: none; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .pa2-pop, .pa2-late { animation: none; opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

/** 3. The front desk fills the week: touch-ups drop into empty slots as reminders go out. */
export function DeskArt() {
  const slots: Array<[number, number, string] | null> = [
    [0, 0, "Botox"], null, [2, 0, "Facial"], null, null,
    null, [1, 1, "Filler"], null, [3, 1, "Peel"], null,
    [0, 2, "IPL"], null, null, [3, 2, "Facial"], [4, 2, "Botox"],
  ];
  return (
    <div className={`${frame} bg-white`} aria-hidden="true">
      <div className="absolute inset-x-[7%] top-[22%] grid grid-cols-5 gap-x-[4%] text-center text-[9px] font-medium text-ink-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="absolute inset-x-[7%] bottom-[9%] top-[32%] grid grid-cols-5 grid-rows-3 gap-[4%]">
        {slots.map((s, i) => (
          <span key={i} className="relative rounded-[5px] border border-dashed border-[#dcdee3]">
            {s && (
              <span className="pa3-chip absolute inset-0 grid place-items-center rounded-[5px] bg-brand text-[8.5px] font-semibold text-white" style={{ animationDelay: `${0.35 * slots.slice(0, i).filter(Boolean).length}s` }}>
                {s[2]}
              </span>
            )}
          </span>
        ))}
      </div>
      <span className="pa3-toast absolute left-1/2 top-[5%] flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#111318] px-2.5 py-1 text-[10px] font-medium text-white" style={{ marginLeft: "-66px" }}>
        <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" stroke="#7fe0b0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Touch-up reminder sent
      </span>
      <style>{`
        .pa3-chip { opacity: 0; transform: scale(.6); animation: pa3-chip 5.4s cubic-bezier(.2,1.4,.4,1) infinite; }
        @keyframes pa3-chip { 0% { opacity: 0; transform: scale(.6); } 6%, 80% { opacity: 1; transform: scale(1); } 90%, 100% { opacity: 0; transform: scale(1); } }
        .pa3-toast { opacity: 0; animation: pa3-toast 5.4s ease-in-out infinite; }
        @keyframes pa3-toast { 0%, 4% { opacity: 0; transform: translateY(-8px); } 10%, 34% { opacity: 1; transform: none; } 40%, 100% { opacity: 0; transform: translateY(-8px); } }
        @media (prefers-reduced-motion: reduce) { .pa3-chip { animation: none; opacity: 1; transform: none; } .pa3-toast { animation: none; opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
