"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CATEGORY, INTERVIEW_QUESTIONS } from "@/lib/interview-questions";
import { IntakeModeSwitch, SectionLabel } from "../components/ui";

const SECTION_LABELS: Record<string, string> = {
  demographics: "Demographics",
  values: "Values",
  purchase: "Purchase history",
  category: CATEGORY[0].toUpperCase() + CATEGORY.slice(1),
};
const SECTION_ORDER = ["demographics", "values", "purchase", "category"];

type TranscriptEntry = { role: "Interviewer" | "Answer"; text: string };

export default function InterviewPage() {
  const router = useRouter();
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgentId, setCreatedAgentId] = useState<number | null>(null);
  const [counts, setCounts] = useState<{ observation_count: number; reflection_count: number } | null>(null);

  const done = qIndex >= INTERVIEW_QUESTIONS.length;
  const current = done ? null : INTERVIEW_QUESTIONS[qIndex];

  const transcript: TranscriptEntry[] = useMemo(() => {
    const out: TranscriptEntry[] = [];
    for (let i = 0; i < answers.length; i++) {
      out.push({ role: "Interviewer", text: INTERVIEW_QUESTIONS[i].prompt });
      out.push({ role: "Answer", text: answers[i] });
    }
    if (!done && current) out.push({ role: "Interviewer", text: current.prompt });
    return out;
  }, [answers, done, current]);

  const sectionsProgress = SECTION_ORDER.map((sec) => {
    const qs = INTERVIEW_QUESTIONS.filter((q) => q.section === sec);
    const answeredInSec = qs.filter((q) => INTERVIEW_QUESTIONS.indexOf(q) < answers.length).length;
    const isCurrent = !done && current?.section === sec;
    return { id: sec, label: SECTION_LABELS[sec], answered: answeredInSec, total: qs.length, isCurrent };
  });

  const record = (value: string) => {
    if (!value.trim()) return;
    setAnswers((cur) => cur.concat(value.trim()));
    setDraft("");
    setQIndex((i) => i + 1);
  };

  const submit = async () => {
    if (submitting || createdAgentId) return;
    setSubmitting(true);
    setError(null);
    try {
      const demographics: Record<string, string> = {};
      const answerPairs: { question: string; answer: string }[] = [];
      let name = "Respondent";
      INTERVIEW_QUESTIONS.forEach((q, i) => {
        const value = answers[i];
        if (value === undefined) return;
        if (q.demographicKey) {
          if (q.demographicKey === "name") name = value;
          else demographics[q.demographicKey] = value;
        } else {
          answerPairs.push({ question: q.prompt, answer: value });
        }
      });
      const result = await api.submitInterview({
        name,
        demographics,
        answers: answerPairs,
        source_interview_id: "self-" + Date.now(),
        run_reflection: true,
      });
      setCreatedAgentId(result.agent.id);
      setCounts({ observation_count: result.observation_count, reflection_count: result.reflection_count });
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid items-start min-h-screen" style={{ gridTemplateColumns: "1fr 268px" }}>
      <div className="flex flex-col min-w-0 min-h-screen">
        <header className="px-10 py-5 border-b border-rule flex items-center justify-between gap-6">
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-semibold tracking-[-0.015em]">
              {SECTION_LABELS.category} habits
            </span>
            <span className="text-[11.5px] text-[#8A8377]">
              {INTERVIEW_QUESTIONS.length} questions · about {Math.round(INTERVIEW_QUESTIONS.length * 0.4)} minutes
            </span>
          </div>
          <div className="flex items-center gap-[14px]">
            <div className="flex gap-[2px]">
              {INTERVIEW_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className="w-[5px] h-[14px] rounded-[2px]"
                  style={{ background: i < answers.length ? "#1F4436" : i === qIndex ? "#7FA891" : "#DCD8CE" }}
                />
              ))}
            </div>
            <span className="text-[12px] text-[#8A8377] tabular-nums flex-shrink-0">
              {Math.min(answers.length + (done ? 0 : 1), INTERVIEW_QUESTIONS.length)} / {INTERVIEW_QUESTIONS.length}
            </span>
          </div>
        </header>

        <div className="flex-1 px-10 pt-7 pb-5 flex flex-col gap-[18px] max-w-[720px] w-full">
          {transcript.map((t, i) =>
            t.role === "Interviewer" ? (
              <div key={i} className="flex flex-col gap-1 items-start">
                <span
                  className="text-[10px] font-semibold tracking-[0.09em] uppercase"
                  style={{ color: i === transcript.length - 1 && !done ? "#1F4436" : "#A8A296" }}
                >
                  Interviewer
                </span>
                <div
                  className="leading-[1.5]"
                  style={
                    i === transcript.length - 1 && !done
                      ? { fontSize: 17, maxWidth: "88%", fontWeight: 500, letterSpacing: "-0.01em", textWrap: "pretty" }
                      : { fontSize: 15, maxWidth: "88%", textWrap: "pretty" }
                  }
                >
                  {t.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col gap-1 items-end">
                <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-[#7FA891]">Answer</span>
                <div
                  className="text-[14px] leading-[1.55] max-w-[82%] px-[14px] py-[11px] bg-forest-tint rounded-tl-[10px] rounded-tr-[10px] rounded-br-[2px] rounded-bl-[10px] text-[#16281F]"
                  style={{ textWrap: "pretty" }}
                >
                  {t.text}
                </div>
              </div>
            ),
          )}

          {done && (
            <div className="p-5 border border-forest rounded-lg bg-forest-tint flex flex-col gap-3">
              {!createdAgentId ? (
                <>
                  <span className="text-[15px] font-semibold">Ready to create this agent</span>
                  <p className="m-0 text-[12.5px] text-[#2E4E3F] leading-[1.5]">
                    {answers.length} answers collected. Submitting embeds each non-demographic answer as one or more
                    observation memories, scores their importance, and (if selected) synthesizes reflections.
                  </p>
                  {error && <p className="m-0 text-[12.5px] text-[#8C3A2E]">{error}</p>}
                  <div className="flex gap-[9px] pt-0.5">
                    <button
                      onClick={submit}
                      disabled={submitting}
                      className="px-[14px] py-2 bg-forest text-paper border-none rounded-[5px] text-[12.5px] font-semibold hover:bg-forest-deep disabled:opacity-60"
                    >
                      {submitting ? "Creating agent…" : "Create agent"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[15px] font-semibold">Agent created from {answers.length} answers</span>
                  <div className="flex flex-col gap-[5px] text-[12.5px] text-[#2E4E3F] tabular-nums">
                    <div>POST /agents/from-interview · 201</div>
                    <div>{counts?.observation_count ?? 0} observation memories embedded</div>
                    <div>{counts?.reflection_count ?? 0} reflections synthesized</div>
                  </div>
                  <div className="flex gap-[9px] pt-0.5">
                    <button
                      onClick={() => router.push("/agents/" + createdAgentId)}
                      className="px-[14px] py-2 bg-forest text-paper border-none rounded-[5px] text-[12.5px] font-semibold hover:bg-forest-deep"
                    >
                      Open agent
                    </button>
                    <button
                      onClick={() => {
                        setQIndex(0);
                        setAnswers([]);
                        setDraft("");
                        setCreatedAgentId(null);
                        setCounts(null);
                        setError(null);
                      }}
                      className="px-[14px] py-2 border border-forest bg-transparent text-forest rounded-[5px] text-[12.5px] font-semibold hover:bg-[#DCE8E0]"
                    >
                      Start another
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!done && current && (
          <div className="sticky bottom-0 border-t border-rule bg-[#F4F2EC] px-10 pt-4 pb-5">
            <div className="max-w-[720px] flex flex-col gap-[11px]">
              {current.kind === "choice" && current.options && (
                <div className="flex flex-wrap gap-[6px]">
                  {current.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => record(opt)}
                      className="px-[13px] py-[7px] border border-rule bg-[#FCFBF8] rounded-full text-[12.5px] hover:border-forest hover:text-forest"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-[10px] items-end">
                {current.kind === "long" ? (
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        record(draft);
                      }
                    }}
                    rows={2}
                    placeholder="Type your answer — ⌘↵ to send"
                    className="flex-1 px-[13px] py-[11px] border border-rule rounded-[6px] bg-[#FCFBF8] text-[14px] leading-[1.55] outline-none resize-none focus:border-forest"
                  />
                ) : (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") record(draft);
                    }}
                    type={current.kind === "number" ? "number" : "text"}
                    placeholder="Type your answer — ↵ to send"
                    className="flex-1 px-[13px] py-[11px] border border-rule rounded-[6px] bg-[#FCFBF8] text-[14px] outline-none focus:border-forest"
                  />
                )}
                <button
                  onClick={() => record(draft)}
                  className="px-[18px] py-[11px] bg-forest text-paper border-none rounded-[6px] text-[13px] font-semibold flex-shrink-0 hover:bg-forest-deep"
                >
                  {qIndex >= INTERVIEW_QUESTIONS.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="border-l border-rule pt-5 pl-[22px] pr-8 pb-10 flex flex-col gap-6 sticky top-0 min-h-screen bg-[#F4F2EC]">
        <div className="flex flex-col gap-[9px]">
          <SectionLabel>Intake mode</SectionLabel>
          <IntakeModeSwitch mode="self" />
        </div>

        <div className="flex flex-col gap-[9px]">
          <SectionLabel>Sections</SectionLabel>
          <div className="flex flex-col gap-[3px]">
            {sectionsProgress.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-[5px] text-[12.5px]"
                style={{
                  color: s.answered === s.total ? "#1F4436" : s.isCurrent ? "#191A17" : "#A8A296",
                  fontWeight: s.isCurrent ? 600 : 400,
                }}
              >
                <span>{s.label}</span>
                <span className="tabular-nums text-[11.5px]">
                  {s.answered}/{s.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[9px] border-t border-rule pt-[18px]">
          <SectionLabel>Answers so far</SectionLabel>
          <span className="text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{answers.length}</span>
          <p className="m-0 text-[11.5px] leading-[1.55] text-[#8A8377]">
            Non-demographic answers are split on sentence boundaries so each fact becomes an independently
            retrievable memory once submitted.
          </p>
        </div>
      </aside>
    </div>
  );
}
