const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type Agent = {
  id: number;
  name: string;
  demographics: Record<string, unknown>;
  source_interview_id: string | null;
  observations: number;
  reflections: number;
  created_at: string;
};

export type AgentDetail = Agent & { mean_importance: number };

export type MemoryType = "observation" | "reflection" | "plan";

export type Memory = {
  id: number;
  agent_id: number;
  content: string;
  importance_score: number;
  memory_type: MemoryType;
  created_at: string;
};

export type ScoredMemory = {
  memory: Memory;
  similarity: number;
  recency: number;
  importance: number;
  score: number;
  used?: boolean;
};

export type Scenario = {
  id: number;
  name: string;
  prompt: string;
  created_by: string | null;
  created_at: string;
  agents_run?: number;
  last_run_at?: string | null;
};

export type SimulationRunRow = {
  id: number;
  agent_id: number;
  agent_name: string;
  response: string;
  retrieved_memory_ids: number[];
  created_at: string;
};

export type RunDetail = {
  id: number;
  scenario_id: number;
  agent_id: number;
  agent_name: string;
  demographics: Record<string, unknown>;
  scenario_prompt: string;
  response: string;
  retrieved_memory_ids: number[];
  created_at: string;
  memories: ScoredMemory[];
  memories_unscored: Memory[];
};

export type BatchReport = {
  scenario_id: number;
  agents_run: number;
  agents_failed: number;
  sentiment_distribution: Record<string, number>;
  themes: { label: string; summary: string; agent_count: number }[];
  notable_quotes: { agent_id: number; agent_name: string; text: string }[];
};

export type EngineConfig = {
  llm_provider: string;
  llm_model: string;
  embedding_provider: string;
  embedding_model: string;
  concurrency: number;
};

export const api = {
  agents: (q?: string) => req<Agent[]>("/agents" + (q ? "?q=" + encodeURIComponent(q) : "")),
  agent: (agentId: number) => req<AgentDetail>("/agents/" + agentId),
  memories: (agentId: number, type?: string) =>
    req<Memory[]>("/agents/" + agentId + "/memories" + (type ? "?memory_type=" + type : "")),
  reflect: (agentId: number) => req<Memory[]>("/agents/" + agentId + "/reflect", { method: "POST" }),
  scenarios: () => req<Scenario[]>("/scenarios"),
  scenario: (scenarioId: number) => req<Scenario>("/scenarios/" + scenarioId),
  createScenario: (body: { name: string; prompt: string; created_by?: string }) =>
    req<Scenario>("/scenarios", { method: "POST", body: JSON.stringify(body) }),
  submitInterview: (body: unknown) =>
    req<{ agent: Agent; observation_count: number; reflection_count: number }>(
      "/agents/from-interview",
      { method: "POST", body: JSON.stringify(body) },
    ),
  runs: (scenarioId: number) => req<SimulationRunRow[]>("/scenarios/" + scenarioId + "/runs"),
  runDetail: (runId: number) => req<RunDetail>("/runs/" + runId),
  scenarioReport: (scenarioId: number) => req<BatchReport>("/scenarios/" + scenarioId + "/report"),
  config: () => req<EngineConfig>("/config"),
};

export type CohortQuestion = { question: string; demographic_key?: string | null; options?: string[] | null };

/** SSE cohort generation. Returns an unsubscribe fn. */
export function streamCohort(
  brief: string,
  count: number,
  questions: CohortQuestion[],
  handlers: {
    onProgress?: (done: number, total: number, name: string | null, error: string | null) => void;
    onDone?: (agentIds: number[]) => void;
    onError?: (m: string) => void;
  },
) {
  const controller = new AbortController();
  (async () => {
    const res = await fetch(BASE + "/agents/cohort/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brief, count, questions }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const msg = JSON.parse(part.slice(6));
        if (msg.type === "progress") handlers.onProgress?.(msg.done, msg.total, msg.name, msg.error);
        if (msg.type === "done") handlers.onDone?.(msg.agent_ids);
        if (msg.type === "error") handlers.onError?.(msg.message);
      }
    }
  })().catch((e) => {
    if (e?.name === "AbortError") return;
    handlers.onError?.(String(e));
  });
  return () => controller.abort();
}

/** SSE batch run. Returns an unsubscribe fn. */
export function streamBatchRun(
  scenarioId: number,
  agentIds: number[] | null,
  handlers: { onProgress?: (d: number, t: number) => void; onReport?: (r: BatchReport) => void; onError?: (m: string) => void },
) {
  const controller = new AbortController();
  (async () => {
    const res = await fetch(BASE + "/scenarios/" + scenarioId + "/run/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agent_ids: agentIds }),
      signal: controller.signal,
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const msg = JSON.parse(part.slice(6));
        if (msg.type === "progress") handlers.onProgress?.(msg.done, msg.total);
        if (msg.type === "report") handlers.onReport?.(msg.report);
        if (msg.type === "error") handlers.onError?.(msg.message);
      }
    }
  })().catch((e) => {
    if (e?.name === "AbortError") return; // cleanup-triggered abort, not a real failure
    handlers.onError?.(String(e));
  });
  return () => controller.abort();
}
