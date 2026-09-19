import Link from "next/link";
import { api } from "@/lib/api";
import { timeAgo } from "../components/ui";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const scenarios = await api.scenarios();

  return (
    <div className="flex flex-col">
      <header className="px-10 pt-[34px] pb-[22px] border-b border-rule flex items-end justify-between gap-8">
        <div className="flex flex-col gap-[7px] max-w-[560px]">
          <h1 className="m-0 text-[27px] font-semibold tracking-[-0.025em]">Results</h1>
          <p className="m-0 text-[13.5px] leading-[1.55] text-[#6E6A60]" style={{ textWrap: "pretty" }}>
            Every scenario created against this cohort. Open one for the aggregated sentiment, themes, and quotes.
          </p>
        </div>
        <Link
          href="/scenario/new"
          className="px-[15px] py-2 bg-forest text-paper border-none rounded-[5px] text-[12.5px] font-semibold flex-shrink-0 no-underline hover:bg-forest-deep"
        >
          New scenario
        </Link>
      </header>

      <div
        className="grid px-10 py-[9px] border-b border-rule text-[10px] font-semibold tracking-[0.09em] uppercase text-[#A8A296]"
        style={{ gridTemplateColumns: "1.6fr 100px 140px" }}
      >
        <span>Scenario</span>
        <span className="text-right">Agents run</span>
        <span className="text-right">Last run</span>
      </div>

      {scenarios.length === 0 && (
        <div className="px-10 py-16 text-center text-[13.5px] text-[#8A8377]">
          No scenarios yet. <Link href="/scenario/new">Create one →</Link>
        </div>
      )}

      {scenarios.map((s) => (
        <Link
          key={s.id}
          href={"/scenario/" + s.id + "/report"}
          className="grid items-center px-10 py-[15px] border-b border-[#E6E2D9] cursor-pointer text-[13px] no-underline text-ink hover:bg-[#F1EFE8]"
          style={{ gridTemplateColumns: "1.6fr 100px 140px" }}
        >
          <div className="flex flex-col gap-[3px] min-w-0 pr-6">
            <span className="font-semibold tracking-[-0.01em]">{s.name}</span>
            <span className="text-[11.5px] text-[#A8A296]" style={{ textWrap: "pretty" }}>
              {s.prompt.length > 120 ? s.prompt.slice(0, 118).trim() + "…" : s.prompt}
            </span>
          </div>
          <span className="text-right tabular-nums text-[#6E6A60]">{s.agents_run ?? 0}</span>
          <span className="text-right text-[12px] text-[#8A8377] tabular-nums">
            {s.last_run_at ? timeAgo(s.last_run_at) : "not run yet"}
          </span>
        </Link>
      ))}
    </div>
  );
}
