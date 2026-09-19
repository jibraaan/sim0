"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, streamBatchRun } from "@/lib/api";
import type { Scenario } from "@/lib/api";

export default function RunningPage() {
  return (
    <Suspense fallback={null}>
      <RunningView />
    </Suspense>
  );
}

function RunningView() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const scenarioId = Number(params.id);
  const agentIds = (search.get("agents") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<"simulating" | "aggregating">("simulating");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    api.scenario(scenarioId).then(setScenario).catch(() => {});
  }, [scenarioId]);

  useEffect(() => {
    // Guard against React Strict Mode's dev-only double-invoke: this stream kicks off a
    // real batch simulation server-side, so starting it twice would double the LLM cost.
    // We deliberately don't abort on cleanup either — the batch keeps running server-side
    // regardless, so there's nothing correct to cancel by leaving this page.
    if (startedRef.current) return;
    startedRef.current = true;
    streamBatchRun(scenarioId, agentIds.length ? agentIds : null, {
      onProgress: (d, t) => {
        setDone(d);
        setTotal(t);
        if (d >= t) setStage("aggregating");
      },
      onReport: () => {
        router.push("/scenario/" + scenarioId + "/report");
      },
      onError: (m) => setError(m),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-10 py-[60px] gap-[34px]">
      <div className="flex flex-col gap-2 items-center text-center max-w-[460px]">
        <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#A8A296]">
          {stage === "aggregating" ? "Aggregating responses" : "Simulating"}
        </span>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em]" style={{ textWrap: "pretty" }}>
          {scenario?.name ?? "Running scenario…"}
        </h1>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 items-center text-center max-w-[460px]">
          <p className="m-0 text-[13px] text-[#8C3A2E]">{error}</p>
          <button
            onClick={() => router.push("/scenario/new")}
            className="px-[15px] py-2 bg-forest text-paper border-none rounded-[5px] text-[12.5px] font-semibold hover:bg-forest-deep"
          >
            Back to new scenario
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-3" style={{ maxWidth: 620 }}>
          <div className="flex items-baseline justify-between">
            <span className="text-[34px] font-semibold tabular-nums tracking-[-0.03em]">{done}</span>
            <span className="text-[13px] text-[#8A8377] tabular-nums">of {total || "…"} agents</span>
          </div>
          <div className="h-[6px] bg-[#E6E2D9] rounded-[3px] overflow-hidden">
            <div
              className="h-full bg-forest"
              style={{ width: pct + "%", transition: "width 200ms linear" }}
            />
          </div>
          <div className="flex justify-between text-[11.5px] text-[#A8A296] tabular-nums">
            <span>{stage === "aggregating" ? "all responses stored" : "simulating in parallel"}</span>
            <span>{stage === "aggregating" ? "one aggregation call" : pct + "%"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
