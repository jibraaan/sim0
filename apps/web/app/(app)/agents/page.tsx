import { api } from "@/lib/api";
import { AgentsTable } from "./AgentsTable";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await api.agents();
  const memoryTotal = agents.reduce((n, a) => n + a.observations, 0);
  const reflectionTotal = agents.reduce((n, a) => n + a.reflections, 0);

  return (
    <div className="flex flex-col">
      <header className="px-10 pt-[34px] pb-[22px] border-b border-rule flex items-end justify-between gap-8">
        <div className="flex flex-col gap-[7px] max-w-[560px]">
          <h1 className="m-0 text-[27px] font-semibold tracking-[-0.025em]">Agents</h1>
          <p className="m-0 text-[13.5px] leading-[1.55] text-[#6E6A60]" style={{ textWrap: "pretty" }}>
            Each agent is seeded from one interview transcript. Memories are embedded on intake; reflections are
            synthesized from the highest-importance memories.
          </p>
        </div>
        <div className="flex gap-[26px] pb-[3px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em]">{agents.length}</span>
            <span className="text-[10.5px] tracking-[0.07em] uppercase text-[#8A8377]">agents</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em]">{memoryTotal}</span>
            <span className="text-[10.5px] tracking-[0.07em] uppercase text-[#8A8377]">memories</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[22px] font-semibold tabular-nums tracking-[-0.02em]">{reflectionTotal}</span>
            <span className="text-[10.5px] tracking-[0.07em] uppercase text-[#8A8377]">reflections</span>
          </div>
        </div>
      </header>

      <AgentsTable agents={agents} />
    </div>
  );
}
