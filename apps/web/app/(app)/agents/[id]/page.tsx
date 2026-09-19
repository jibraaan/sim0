import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { AgentDetailView } from "./AgentDetailView";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const agentId = Number(params.id);
  if (!Number.isFinite(agentId)) notFound();

  const [agent, memories] = await Promise.all([
    api.agent(agentId).catch(() => null),
    api.memories(agentId),
  ]);
  if (!agent) notFound();

  return <AgentDetailView agent={agent} memories={memories} />;
}
