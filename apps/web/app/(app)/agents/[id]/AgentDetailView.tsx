"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { AgentDetail, Memory } from "@/lib/api";
import { MEMORY_TYPE_PILL, Pill, SectionLabel, importanceStyle, timeAgo } from "../../components/ui";

const TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "observation", label: "Observations" },
  { id: "reflection", label: "Reflections" },
  { id: "plan", label: "Plans" },
];

export function AgentDetailView({ agent, memories }: { agent: AgentDetail; memories: Memory[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [reflecting, setReflecting] = useState(false);

  const chips = useMemo(() => {
    const d = agent.demographics || {};
    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
  }, [agent.demographics]);

  const shown = useMemo(() => {
    const list = tab === "all" ? memories : memories.filter((m) => m.memory_type === tab);
    return list.slice().sort((a, b) => b.importance_score - a.importance_score);
  }, [memories, tab]);

  const totalMem = agent.observations + agent.reflections || 1;
  const obsPct = Math.round((agent.observations / totalMem) * 100);
  const reflPct = Math.round((agent.reflections / totalMem) * 100);

  const runReflect = async () => {
    if (reflecting) return;
    setReflecting(true);
    try {
      await api.reflect(agent.id);
      router.refresh();
    } finally {
      setReflecting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <header className="px-10 pt-[22px] pb-5 border-b border-rule">
        <Link href="/agents" className="inline-block pb-3 text-[12px] text-[#8A8377] hover:text-forest no-underline">
          ← Agents
        </Link>
        <div className="flex items-start justify-between gap-10">
          <div className="flex flex-col gap-[9px] min-w-0">
            <h1 className="m-0 text-[26px] font-semibold tracking-[-0.025em]">{agent.name}</h1>
            <div className="flex flex-wrap gap-[6px]">
              {chips.map((c) => (
                <span
                  key={c}
                  className="px-[9px] py-[3px] border border-rule rounded-full text-[11.5px] text-[#4A463E] bg-[#FCFBF8]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={runReflect}
            className="px-[14px] py-2 border border-forest bg-transparent text-forest rounded-[5px] text-[12.5px] font-semibold flex-shrink-0 hover:bg-forest-tint"
          >
            {reflecting ? "Synthesizing…" : "Run reflection"}
          </button>
        </div>
      </header>

      <div className="grid items-start" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="pt-5 pl-10 pr-[34px] pb-12 min-w-0">
          <div className="flex items-center gap-[6px] pb-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-3 py-[6px] rounded-[5px] text-[12.5px] border"
                style={
                  tab === t.id
                    ? { borderColor: "#1F4436", background: "#E8EFEA", color: "#1F4436", fontWeight: 600 }
                    : { borderColor: "#DCD8CE", background: "transparent", color: "#6E6A60" }
                }
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] tracking-[0.07em] uppercase text-[#A8A296]">
              sorted by importance
            </span>
          </div>

          <div className="flex flex-col gap-px border border-rule rounded-[7px] overflow-hidden bg-rule">
            {shown.length === 0 && (
              <div className="bg-[#FCFBF8] px-4 py-8 text-center text-[13px] text-[#A8A296]">No memories yet.</div>
            )}
            {shown.map((m) => {
              const impStyle = importanceStyle(m.importance_score);
              const typeStyle = MEMORY_TYPE_PILL[m.memory_type];
              return (
                <div
                  key={m.id}
                  className="bg-[#FCFBF8] px-4 py-[13px] grid gap-[14px] items-start"
                  style={{ gridTemplateColumns: "26px 1fr 118px" }}
                >
                  <span
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[11.5px] font-semibold tabular-nums"
                    style={{ background: impStyle.bg, color: impStyle.fg }}
                  >
                    {m.importance_score}
                  </span>
                  <div className="flex flex-col gap-[5px] min-w-0">
                    <p className="m-0 text-[13.5px] leading-[1.55]" style={{ textWrap: "pretty" }}>
                      {m.content}
                    </p>
                    <span className="text-[10.5px] text-[#A8A296] tabular-nums">
                      #{m.id} · {timeAgo(m.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-end pt-px">
                    <Pill bg={typeStyle.bg} fg={typeStyle.fg}>
                      {m.memory_type}
                    </Pill>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="border-l border-rule pt-[22px] pl-6 pr-10 pb-12 flex flex-col gap-[26px] sticky top-0">
          <div className="flex flex-col gap-[10px]">
            <SectionLabel>Memory mix</SectionLabel>
            <div className="flex h-2 rounded-[4px] overflow-hidden bg-[#E6E2D9]">
              <div style={{ width: obsPct + "%", background: "#1F4436" }} />
              <div style={{ width: reflPct + "%", background: "#7FA891" }} />
            </div>
            <div className="flex flex-col gap-[5px] text-[12px] text-[#6E6A60]">
              <div className="flex justify-between">
                <span>Observations</span>
                <span className="tabular-nums text-ink">{agent.observations}</span>
              </div>
              <div className="flex justify-between">
                <span>Reflections</span>
                <span className="tabular-nums text-ink">{agent.reflections}</span>
              </div>
              <div className="flex justify-between">
                <span>Mean importance</span>
                <span className="tabular-nums text-ink">{agent.mean_importance.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[9px]">
            <SectionLabel>Source</SectionLabel>
            <div className="flex flex-col gap-[5px] text-[12px] text-[#6E6A60] leading-[1.5]">
              <div>Interview {agent.source_interview_id ?? "—"}</div>
              <div>Created {new Date(agent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
          </div>

          <div className="flex flex-col gap-[9px]">
            <SectionLabel>Appears in</SectionLabel>
            <Link href="/results" className="text-[12.5px] text-forest leading-[1.45] hover:underline">
              Browse past runs →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
