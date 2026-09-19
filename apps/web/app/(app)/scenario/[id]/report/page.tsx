import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { SENTIMENT_COLOR, SectionLabel, fmt } from "../../../components/ui";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const scenarioId = Number(params.id);
  if (!Number.isFinite(scenarioId)) notFound();

  const [scenario, report, runs] = await Promise.all([
    api.scenario(scenarioId).catch(() => null),
    api.scenarioReport(scenarioId).catch(() => null),
    api.runs(scenarioId).catch(() => []),
  ]);
  if (!scenario) notFound();

  const runByAgent = new Map(runs.map((r) => [r.agent_id, r]));
  const sentEntries = report
    ? (["positive", "mixed", "negative"] as const).map((k) => ({ key: k, count: report.sentiment_distribution[k] ?? 0 }))
    : [];
  const sentTotal = sentEntries.reduce((n, s) => n + s.count, 0) || 1;

  return (
    <div className="flex flex-col">
      <header className="px-10 pt-[30px] pb-[22px] border-b border-rule flex items-start justify-between gap-10">
        <div className="flex flex-col gap-[9px] max-w-[640px]">
          <Link
            href="/results"
            className="self-start text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#A8A296] hover:text-forest no-underline"
          >
            ← Results
          </Link>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.025em]" style={{ textWrap: "pretty" }}>
            {scenario.name}
          </h1>
          <p className="m-0 text-[13px] leading-[1.6] text-[#6E6A60]" style={{ textWrap: "pretty" }}>
            {scenario.prompt}
          </p>
        </div>
        <div className="flex flex-col gap-[5px] text-[11.5px] text-[#8A8377] text-right flex-shrink-0 tabular-nums">
          <span>{runs.length} responses</span>
          <span>{report ? report.agents_failed + " failed" : ""}</span>
        </div>
      </header>

      {!report || runs.length === 0 ? (
        <div className="px-10 py-16 text-center text-[13.5px] text-[#8A8377]">
          No responses stored for this scenario yet.
        </div>
      ) : (
        <>
          <div className="px-10 pt-[26px] pb-5 border-b border-rule grid gap-12" style={{ gridTemplateColumns: "1.15fr 1fr" }}>
            <div className="flex flex-col gap-[13px]">
              <SectionLabel>Sentiment distribution</SectionLabel>
              <div className="flex h-[30px] rounded-[5px] overflow-hidden">
                {sentEntries.map((s) => {
                  const pct = Math.round((s.count / sentTotal) * 100);
                  if (pct === 0) return null;
                  return (
                    <div
                      key={s.key}
                      className="flex items-center justify-center text-[11.5px] font-semibold tabular-nums"
                      style={{
                        width: pct + "%",
                        background: SENTIMENT_COLOR[s.key],
                        color: s.key === "mixed" ? "#2A1B0B" : "#F7F5F0",
                      }}
                    >
                      {pct}%
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-5">
                {sentEntries.map((s) => (
                  <div key={s.key} className="flex items-center gap-[7px]">
                    <div className="w-[9px] h-[9px] rounded-[2px]" style={{ background: SENTIMENT_COLOR[s.key] }} />
                    <span className="text-[12.5px] text-[#4A463E] capitalize">{s.key}</span>
                    <span className="text-[12.5px] text-[#8A8377] tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[13px]">
              <SectionLabel>Notable quotes</SectionLabel>
              <div className="flex flex-col gap-[11px]">
                {report.notable_quotes.length === 0 && (
                  <span className="text-[12.5px] text-[#A8A296]">None returned.</span>
                )}
                {report.notable_quotes.map((q, i) => {
                  const run = runByAgent.get(q.agent_id);
                  const body = (
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] leading-[1.55] text-ink" style={{ textWrap: "pretty" }}>
                        &ldquo;{q.text}&rdquo;
                      </span>
                      <span className="text-[11px] text-[#8A8377]">{q.agent_name}</span>
                    </div>
                  );
                  return run ? (
                    <Link
                      key={i}
                      href={"/runs/" + run.id}
                      className="text-left border-l-2 border-rule pl-[13px] no-underline hover:border-forest"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div key={i} className="border-l-2 border-rule pl-[13px]">
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-10 pt-[26px] pb-2 flex flex-col gap-[15px]">
            <SectionLabel>Key themes</SectionLabel>
            <div
              className="grid gap-px bg-rule border border-rule rounded-[7px] overflow-hidden"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(258px, 1fr))" }}
            >
              {report.themes.length === 0 && (
                <div className="bg-[#FCFBF8] px-[18px] py-[17px] text-[12.5px] text-[#A8A296]">None returned.</div>
              )}
              {report.themes.map((t, i) => {
                const maxN = Math.max(...report.themes.map((x) => x.agent_count), 1);
                const pct = Math.round((t.agent_count / maxN) * 100);
                return (
                  <div key={i} className="bg-[#FCFBF8] px-[18px] py-[17px] flex flex-col gap-[9px]">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] font-semibold tracking-[-0.01em]" style={{ textWrap: "pretty" }}>
                        {t.label}
                      </span>
                      <span className="text-[12px] text-[#8A8377] tabular-nums flex-shrink-0">{t.agent_count}</span>
                    </div>
                    <div className="h-[3px] bg-[#E6E2D9] rounded-[2px] overflow-hidden">
                      <div className="h-full bg-forest" style={{ width: pct + "%" }} />
                    </div>
                    <p className="m-0 text-[12.5px] leading-[1.55] text-[#6E6A60]" style={{ textWrap: "pretty" }}>
                      {t.summary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-10 pt-[30px] pb-12 flex flex-col gap-[14px]">
            <SectionLabel>Individual responses</SectionLabel>
            <div className="flex flex-col gap-px bg-rule border border-rule rounded-[7px] overflow-hidden">
              {runs.map((r) => (
                <Link
                  key={r.id}
                  href={"/runs/" + r.id}
                  className="bg-[#FCFBF8] px-[18px] py-[15px] grid gap-4 items-start cursor-pointer no-underline text-ink hover:bg-[#F4F2EC]"
                  style={{ gridTemplateColumns: "168px 1fr 92px" }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[13px] font-semibold tracking-[-0.01em]">{r.agent_name}</span>
                    <span className="text-[11px] text-[#A8A296]">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="m-0 text-[13px] leading-[1.55] text-[#4A463E]" style={{ textWrap: "pretty" }}>
                    {r.response.length > 190 ? r.response.slice(0, 188).trim() + "…" : r.response}
                  </p>
                  <span className="text-[11px] text-[#8A8377] text-right tabular-nums">
                    {r.retrieved_memory_ids.length} mem
                  </span>
                </Link>
              ))}
            </div>
            <span className="text-[12px] text-[#A8A296]">{fmt(runs.length)} responses. Click any row for the memory trace.</span>
          </div>
        </>
      )}
    </div>
  );
}
