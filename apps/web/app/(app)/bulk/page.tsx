"use client";

import { useMemo, useState } from "react";
import { streamCohort } from "@/lib/api";
import { CATEGORY, INTERVIEW_QUESTIONS } from "@/lib/interview-questions";
import { IntakeModeSwitch, SectionLabel } from "../components/ui";

const COHORT_QUESTIONS = INTERVIEW_QUESTIONS.filter((q) => q.demographicKey !== "name").map((q) => ({
  question: q.prompt,
  demographic_key: q.demographicKey ?? null,
  options: q.options ?? null,
}));

type PersonaEvent = { name: string | null; error: string | null };

export default function BulkPage() {
  const [brief, setBrief] = useState("");
  const [count, setCount] = useState(6);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [events, setEvents] = useState<PersonaEvent[]>([]);
  const [agentIds, setAgentIds] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const succeeded = useMemo(() => events.filter((e) => !e.error).length, [events]);

  const generate = () => {
    if (running || !brief.trim()) return;
    setRunning(true);
    setError(null);
    setEvents([]);
    setAgentIds(null);
    setProgress({ done: 0, total: count });

    streamCohort(brief.trim(), count, COHORT_QUESTIONS, {
      onProgress: (done, total, name, err) => {
        setProgress({ done, total });
        setEvents((cur) => cur.concat({ name, error: err }));
      },
      onDone: (ids) => {
        setAgentIds(ids);
        setRunning(false);
      },
      onError: (m) => {
        setError(m);
        setRunning(false);
      },
    });
  };

  return (
    <div className="grid items-start min-h-screen" style={{ gridTemplateColumns: "1fr 268px" }}>
      <div className="flex flex-col min-w-0 min-h-screen">
        <header className="px-10 py-5 border-b border-rule flex items-center justify-between gap-6">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-semibold tracking-[-0.015em]">Generate a cohort</span>
            <span className="text-[11.5px] text-[#8A8377]">
              LLM-invented respondents, run through the same {CATEGORY} interview and memory pipeline as a real one
            </span>
          </div>
          {progress.total > 0 && (
            <span className="text-[12px] text-[#8A8377] tabular-nums flex-shrink-0">
              {progress.done} / {progress.total}
            </span>
          )}
        </header>

        <div className="flex-1 px-10 pt-7 pb-8 flex flex-col gap-6 max-w-[720px] w-full">
          <div className="flex flex-col gap-[9px]">
            <SectionLabel>Target audience brief</SectionLabel>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={running}
              rows={4}
              placeholder="e.g. Women 25-45, middle income, currently color their hair at home with box dye, price-sensitive but open to premium if it solves a real annoyance"
              className="px-[13px] py-[11px] border border-rule rounded-[6px] bg-[#FCFBF8] text-[14px] leading-[1.55] outline-none resize-none focus:border-forest disabled:opacity-60"
            />
          </div>

          <div className="flex items-end gap-[10px]">
            <div className="flex flex-col gap-[9px]">
              <SectionLabel>Cohort size</SectionLabel>
              <input
                type="number"
                min={1}
                max={25}
                value={count}
                disabled={running}
                onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
                className="w-[90px] px-[13px] py-[11px] border border-rule rounded-[6px] bg-[#FCFBF8] text-[14px] outline-none focus:border-forest disabled:opacity-60"
              />
            </div>
            <button
              onClick={generate}
              disabled={running || !brief.trim()}
              className="px-[18px] py-[11px] bg-forest text-paper border-none rounded-[6px] text-[13px] font-semibold hover:bg-forest-deep disabled:opacity-60"
            >
              {running ? "Generating…" : "Generate cohort"}
            </button>
          </div>

          {error && <p className="m-0 text-[12.5px] text-[#8C3A2E]">{error}</p>}

          {events.length > 0 && (
            <div className="flex flex-col gap-[9px] pt-2 border-t border-rule">
              <SectionLabel>Personas</SectionLabel>
              <div className="flex flex-col gap-[3px]">
                {events.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-[7px] px-[10px] text-[13px] border-b border-rule last:border-b-0">
                    <span className={e.error ? "text-[#8C3A2E]" : ""}>
                      {e.error ? `Failed: ${e.error.slice(0, 80)}` : e.name ?? "Unnamed persona"}
                    </span>
                    {!e.error && <span className="text-[11px] text-[#8A8377]">created</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {agentIds && (
            <div className="p-5 border border-forest rounded-lg bg-forest-tint flex flex-col gap-3">
              <span className="text-[15px] font-semibold">
                {agentIds.length} of {count} personas created
              </span>
              <p className="m-0 text-[12.5px] text-[#2E4E3F] leading-[1.5]">
                Each one went through the same embed → score → reflect pipeline as a real interview submission.
              </p>
              <div className="flex gap-[9px] pt-0.5">
                <a
                  href="/agents"
                  className="px-[14px] py-2 bg-forest text-paper border-none rounded-[5px] text-[12.5px] font-semibold no-underline hover:bg-forest-deep hover:no-underline"
                >
                  View agents
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="border-l border-rule pt-5 pl-[22px] pr-8 pb-10 flex flex-col gap-6 sticky top-0 min-h-screen bg-[#F4F2EC]">
        <div className="flex flex-col gap-[9px]">
          <SectionLabel>Intake mode</SectionLabel>
          <IntakeModeSwitch mode="bulk" />
        </div>

        <div className="flex flex-col gap-[9px] border-t border-rule pt-[18px]">
          <SectionLabel>Created this run</SectionLabel>
          <span className="text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{succeeded}</span>
          <p className="m-0 text-[11.5px] leading-[1.55] text-[#8A8377]">
            One LLM call invents each person's demographics and interview answers; a failed persona is skipped, not
            retried indefinitely, so the count can land under the target.
          </p>
        </div>
      </aside>
    </div>
  );
}
