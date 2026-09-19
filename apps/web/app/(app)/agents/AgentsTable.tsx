"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/api";

function profileLines(a: Agent): [string, string] {
  const d = a.demographics || {};
  const parts1 = [d.age, d.occupation].filter(Boolean);
  const parts2 = [d.location, d.household_income].filter(Boolean);
  return [parts1.length ? parts1.join(" · ") : "—", parts2.length ? parts2.join(" · ") : ""];
}

export function AgentsTable({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      const [l1, l2] = profileLines(a);
      return (a.name + " " + l1 + " " + l2 + " " + (a.source_interview_id ?? "")).toLowerCase().includes(q);
    });
  }, [agents, query]);

  const selSet = new Set(selected);
  const selectedCount = selectAllMode ? agents.length : selected.length;

  const toggle = (id: number) => {
    setSelectAllMode(false);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat(id)));
  };

  const runScenario = () => {
    if (selectAllMode || selected.length === 0) {
      router.push("/scenario/new");
    } else {
      router.push("/scenario/new?agents=" + selected.join(","));
    }
  };

  return (
    <div className="flex flex-col">
      <div className="px-10 py-[14px] border-b border-rule flex items-center gap-3 bg-[#F4F2EC]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, occupation, source…"
          className="flex-1 max-w-[320px] px-[11px] py-[7px] border border-rule rounded-[5px] bg-[#FCFBF8] text-[13px] outline-none focus:border-forest"
        />
        <div className="flex items-center gap-[7px] text-[12.5px] text-[#6E6A60]">
          <span className="tabular-nums font-semibold text-ink">{selectedCount}</span>
          <span>selected</span>
        </div>
        <button
          onClick={() => {
            setSelectAllMode(true);
            setSelected([]);
          }}
          className="px-[11px] py-[6px] border border-rule bg-transparent rounded-[5px] text-[12.5px] hover:border-forest hover:text-forest"
        >
          Select all
        </button>
        <button
          onClick={() => {
            setSelectAllMode(false);
            setSelected([]);
          }}
          className="px-[11px] py-[6px] border border-transparent bg-transparent rounded-[5px] text-[12.5px] text-[#8A8377] hover:text-ink"
        >
          Clear
        </button>
        <button
          onClick={runScenario}
          className="ml-auto px-[15px] py-2 bg-forest text-paper border-none rounded-[5px] text-[12.5px] font-semibold hover:bg-forest-deep"
        >
          Run a scenario →
        </button>
      </div>

      <div
        className="grid px-10 py-[9px] border-b border-rule text-[10px] font-semibold tracking-[0.09em] uppercase text-[#A8A296]"
        style={{ gridTemplateColumns: "34px 1.4fr 1.5fr 0.9fr 88px 88px" }}
      >
        <span />
        <span>Agent</span>
        <span>Profile</span>
        <span>Source</span>
        <span className="text-right">Obs.</span>
        <span className="text-right">Refl.</span>
      </div>

      {filtered.map((a) => {
        const on = selectAllMode || selSet.has(a.id);
        const [l1, l2] = profileLines(a);
        return (
          <div
            key={a.id}
            onClick={() => router.push("/agents/" + a.id)}
            className="grid items-center px-10 py-[13px] border-b border-[#E6E2D9] cursor-pointer text-[13px] hover:bg-[#F1EFE8]"
            style={{ gridTemplateColumns: "34px 1.4fr 1.5fr 0.9fr 88px 88px" }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggle(a.id);
              }}
              className="w-4 h-4 rounded-[3px] flex items-center justify-center cursor-pointer"
              style={{ background: on ? "#1F4436" : "#FCFBF8", border: on ? "1px solid #1F4436" : "1px solid #C9C4B8" }}
            >
              <span className="text-[10px] leading-none text-paper">{on ? "✓" : ""}</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-semibold tracking-[-0.01em]">{a.name}</span>
              <span className="text-[11px] text-[#A8A296] tabular-nums">{a.source_interview_id ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 text-[#6E6A60] text-[12.5px]">
              <span>{l1}</span>
              <span className="text-[11.5px] text-[#A8A296]">{l2}</span>
            </div>
            <div>
              <span className="px-2 py-[2px] rounded-[3px] text-[10.5px] font-semibold tracking-[0.05em] uppercase whitespace-nowrap bg-[#EDEAE2] text-[#4A463E]">
                {a.source_interview_id?.split("-")[0] ?? "manual"}
              </span>
            </div>
            <span className="text-right tabular-nums text-[#6E6A60]">{a.observations}</span>
            <span className="text-right tabular-nums text-[#6E6A60]">{a.reflections}</span>
          </div>
        );
      })}

      <div className="px-10 pt-[18px] pb-10 text-[12px] text-[#A8A296]">
        Showing {filtered.length} of {agents.length} agents.
      </div>
    </div>
  );
}
