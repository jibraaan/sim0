"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/api";
import { SectionLabel } from "../../components/ui";

const CONCURRENCY = 12;

const SCENARIO_TYPES = [
  {
    id: "product",
    label: "New product",
    hint: "Concept reaction and purchase intent",
    name: "New product concept",
    prompt:
      "A brand you know from the drugstore is launching an ammonia-free permanent hair color with no chemical smell, at $18.99 versus the $9.99 box you buy today. It claims salon-level grey coverage. What do you think, and would you buy it on your next trip?",
  },
  {
    id: "pricing",
    label: "Pricing change",
    hint: "Willingness to pay, switching risk",
    name: "Pricing change",
    prompt: "The product you currently use is raising its price from $9.99 to $12.49 and the twin-pack is being discontinued. How do you react, and does this change what you buy next?",
  },
  {
    id: "messaging",
    label: "Messaging test",
    hint: "Which claim lands, which reads false",
    name: "Messaging test",
    prompt: "You see two versions of the same product's packaging: one says \"No compromise,\" the other says \"Nothing to hide.\" Which one makes you want to pick it up, and why?",
  },
  {
    id: "features",
    label: "Feature priority",
    hint: "Forced trade-offs between benefits",
    name: "Feature priority",
    prompt: "If a new product in this category could only improve on one of these — smell, price, or how natural the result looks — which would matter most to you, and why?",
  },
  {
    id: "churn",
    label: "Churn reaction",
    hint: "Response to a change they didn't ask for",
    name: "Churn reaction",
    prompt: "The brand you use switches you automatically to a subscription that ships a refill every 6 weeks at 15% off, charged before it ships, cancellable anytime. How do you feel about this, and what do you do?",
  },
  { id: "free", label: "Free-form", hint: "Write the situation yourself", name: "", prompt: "" },
];

export function NewScenarioForm({ agents, preselected }: { agents: Agent[]; preselected: number[] }) {
  const router = useRouter();
  const [scenarioType, setScenarioType] = useState("product");
  const [name, setName] = useState(SCENARIO_TYPES[0].name);
  const [prompt, setPrompt] = useState(SCENARIO_TYPES[0].prompt);
  const [audience, setAudience] = useState<"all" | "selected">(preselected.length ? "selected" : "all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectType = (id: string) => {
    setScenarioType(id);
    const t = SCENARIO_TYPES.find((x) => x.id === id)!;
    setName(t.name);
    setPrompt(t.prompt);
  };

  const total = audience === "all" ? agents.length : Math.max(1, preselected.length);
  const estCalls = total * 2 + 1;
  const estTime = Math.max(1, Math.round((total * 2.2) / CONCURRENCY));
  const estCost = (total * 0.011 + 0.04).toFixed(2);

  const startRun = async () => {
    if (submitting || !name.trim() || !prompt.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const scenario = await api.createScenario({ name: name.trim(), prompt: prompt.trim() });
      const agentQS = audience === "selected" && preselected.length ? "?agents=" + preselected.join(",") : "";
      router.push("/scenario/" + scenario.id + "/run" + agentQS);
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ maxWidth: 1180 }}>
      <header className="px-10 pt-[34px] pb-[22px] border-b border-rule flex flex-col gap-[7px]">
        <h1 className="m-0 text-[27px] font-semibold tracking-[-0.025em]">New scenario</h1>
        <p className="m-0 text-[13.5px] text-[#6E6A60] max-w-[560px] leading-[1.55]">
          Write the situation as the person would encounter it, not as a research question. Agents respond in first
          person.
        </p>
      </header>

      <div className="grid items-start" style={{ gridTemplateColumns: "1fr 292px" }}>
        <div className="pt-6 pl-10 pr-[34px] pb-12 flex flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-[9px]">
            <SectionLabel>Scenario type</SectionLabel>
            <div className="grid grid-cols-3 gap-[7px]">
              {SCENARIO_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectType(t.id)}
                  className="flex flex-col gap-1 items-start px-3 py-[11px] rounded-[6px] text-left border"
                  style={
                    scenarioType === t.id
                      ? { borderColor: "#1F4436", background: "#E8EFEA" }
                      : { borderColor: "#DCD8CE", background: "#FCFBF8" }
                  }
                >
                  <span className="text-[12.5px] font-semibold">{t.label}</span>
                  <span className="text-[11px] text-[#8A8377] leading-[1.4] text-left">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#A8A296]">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-[9px] border border-rule rounded-[5px] bg-[#FCFBF8] text-[14px] outline-none focus:border-forest"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#A8A296]">Prompt</label>
              <span className="text-[11px] text-[#A8A296] tabular-nums">{prompt.length} chars</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              className="px-[14px] py-[13px] border border-rule rounded-[6px] bg-[#FCFBF8] text-[14px] leading-[1.6] outline-none resize-y focus:border-forest"
            />
            <p className="m-0 text-[11.5px] text-[#A8A296] leading-[1.5]">
              This text is also the retrieval query — memories are ranked against it before the persona prompt is
              built.
            </p>
          </div>
        </div>

        <aside className="border-l border-rule pt-6 pl-6 pr-10 pb-12 flex flex-col gap-[22px] sticky top-0">
          <div className="flex flex-col gap-[10px]">
            <SectionLabel>Audience</SectionLabel>
            <div className="flex flex-col gap-[5px]">
              <button
                onClick={() => setAudience("all")}
                className="flex items-center justify-between gap-2 w-full text-left px-[10px] py-2 rounded-[5px] text-[12.5px] border"
                style={
                  audience === "all"
                    ? { borderColor: "#1F4436", background: "#E8EFEA", color: "#1F4436", fontWeight: 600 }
                    : { borderColor: "#DCD8CE", background: "#FCFBF8", color: "#4A463E" }
                }
              >
                <span>All agents</span>
                <span className="tabular-nums text-[11.5px] text-[#8A8377]">{agents.length}</span>
              </button>
              <button
                onClick={() => setAudience("selected")}
                disabled={preselected.length === 0}
                className="flex items-center justify-between gap-2 w-full text-left px-[10px] py-2 rounded-[5px] text-[12.5px] border disabled:opacity-50"
                style={
                  audience === "selected"
                    ? { borderColor: "#1F4436", background: "#E8EFEA", color: "#1F4436", fontWeight: 600 }
                    : { borderColor: "#DCD8CE", background: "#FCFBF8", color: "#4A463E" }
                }
              >
                <span>Selected</span>
                <span className="tabular-nums text-[11.5px] text-[#8A8377]">{preselected.length}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-[14px] border border-rule rounded-[7px] bg-[#FCFBF8]">
            <SectionLabel>Estimated</SectionLabel>
            <div className="flex flex-col gap-[5px] text-[12.5px] text-[#6E6A60]">
              <div className="flex justify-between">
                <span>Agents</span>
                <span className="tabular-nums text-ink">{total}</span>
              </div>
              <div className="flex justify-between">
                <span>LLM calls</span>
                <span className="tabular-nums text-ink">{estCalls}</span>
              </div>
              <div className="flex justify-between">
                <span>Wall clock</span>
                <span className="tabular-nums text-ink">{estTime}s</span>
              </div>
              <div className="flex justify-between">
                <span>Cost</span>
                <span className="tabular-nums text-ink">${estCost}</span>
              </div>
            </div>
          </div>

          {error && <p className="m-0 text-[12px] text-[#8C3A2E]">{error}</p>}

          <button
            onClick={startRun}
            disabled={submitting || total === 0}
            className="px-4 py-[11px] bg-forest text-paper border-none rounded-[6px] text-[13.5px] font-semibold hover:bg-forest-deep disabled:opacity-60"
          >
            {submitting ? "Starting…" : "Run simulation"}
          </button>
        </aside>
      </div>
    </div>
  );
}
