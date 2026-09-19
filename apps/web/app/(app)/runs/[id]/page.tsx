import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { MEMORY_TYPE_PILL, Pill, SectionLabel, timeAgo } from "../../components/ui";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const runId = Number(params.id);
  if (!Number.isFinite(runId)) notFound();

  const run = await api.runDetail(runId).catch(() => null);
  if (!run) notFound();

  const personaLines = [
    "Name: " + run.agent_name,
    ...Object.entries(run.demographics || {}).map(
      ([k, v]) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) + ": " + v,
    ),
  ];

  const memories = run.memories
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((m) => {
      const sum = m.similarity + m.recency + m.importance || 1;
      return { ...m, simW: Math.round((m.similarity / sum) * 100), recW: Math.round((m.recency / sum) * 100), impW: Math.round((m.importance / sum) * 100) };
    });

  return (
    <div className="flex flex-col">
      <header className="px-10 pt-[22px] pb-5 border-b border-rule">
        <Link
          href={"/scenario/" + run.scenario_id + "/report"}
          className="inline-block pb-3 text-[12px] text-[#8A8377] hover:text-forest no-underline"
        >
          ← Back to report
        </Link>
        <div className="flex items-start justify-between gap-8">
          <div className="flex flex-col gap-[7px]">
            <h1 className="m-0 text-2xl font-semibold tracking-[-0.025em]">{run.agent_name}</h1>
            <span className="text-[12.5px] text-[#8A8377]">{new Date(run.created_at).toLocaleString()}</span>
          </div>
          <Link
            href={"/agents/" + run.agent_id}
            className="px-[13px] py-[7px] border border-rule bg-transparent rounded-[5px] text-[12.5px] flex-shrink-0 no-underline text-ink hover:border-forest hover:text-forest"
          >
            Full memory store →
          </Link>
        </div>
      </header>

      <div className="grid items-start" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="pt-6 pl-10 pr-8 pb-12 flex flex-col gap-5 min-w-0">
          <div className="flex flex-col gap-[9px]">
            <SectionLabel>Response</SectionLabel>
            <p className="m-0 text-[16px] leading-[1.7] tracking-[-0.005em]" style={{ textWrap: "pretty" }}>
              {run.response}
            </p>
          </div>

          <div className="flex flex-col gap-[9px] p-4 border border-rule rounded-[7px] bg-[#FCFBF8]">
            <SectionLabel>Context sent to Claude</SectionLabel>
            <div className="flex flex-col gap-1 text-[12px] leading-[1.6] text-[#4A463E]">
              {personaLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
            <div className="text-[11.5px] text-[#A8A296] pt-1 border-t border-[#E6E2D9] tabular-nums">
              {run.retrieved_memory_ids.length} memories retrieved for this response
            </div>
          </div>
        </div>

        <div className="border-l border-rule pt-6 pl-8 pr-10 pb-12 flex flex-col gap-[14px] min-w-0">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Memories retrieved</SectionLabel>
            <span className="text-[11px] text-[#A8A296]">weighted score</span>
          </div>

          <div className="flex flex-col gap-px bg-rule border border-rule rounded-[7px] overflow-hidden">
            {memories.length === 0 && (
              <div className="bg-[#FCFBF8] px-4 py-6 text-[13px] text-[#A8A296]">No scored memories available.</div>
            )}
            {memories.map((m) => {
              const typeStyle = MEMORY_TYPE_PILL[m.memory.memory_type];
              return (
                <div key={m.memory.id} className="bg-[#FCFBF8] px-4 py-[13px] flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] leading-[1.55] text-ink" style={{ textWrap: "pretty" }}>
                      {m.memory.content}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums flex-shrink-0">{m.score.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex h-1 rounded-[2px] overflow-hidden bg-[#E6E2D9]">
                      <div style={{ width: m.simW + "%", background: "#1F4436" }} />
                      <div style={{ width: m.recW + "%", background: "#7FA891" }} />
                      <div style={{ width: m.impW + "%", background: "#C3D5C9" }} />
                    </div>
                    <span className="text-[10.5px] text-[#A8A296] tabular-nums flex-shrink-0">
                      {m.similarity.toFixed(2)} / {m.recency.toFixed(2)} / {m.importance.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex gap-[9px] items-center">
                    <Pill bg={typeStyle.bg} fg={typeStyle.fg}>
                      {m.memory.memory_type}
                    </Pill>
                    <span className="text-[10.5px] text-[#A8A296] tabular-nums">
                      #{m.memory.id} · {timeAgo(m.memory.created_at)} · imp {m.memory.importance_score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 pt-1">
            <div className="flex items-center gap-[6px]">
              <div className="w-2 h-2 rounded-[2px]" style={{ background: "#1F4436" }} />
              <span className="text-[11px] text-[#8A8377]">similarity</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <div className="w-2 h-2 rounded-[2px]" style={{ background: "#7FA891" }} />
              <span className="text-[11px] text-[#8A8377]">recency</span>
            </div>
            <div className="flex items-center gap-[6px]">
              <div className="w-2 h-2 rounded-[2px]" style={{ background: "#C3D5C9" }} />
              <span className="text-[11px] text-[#8A8377]">importance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
