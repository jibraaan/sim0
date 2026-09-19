import { api } from "@/lib/api";
import { NewScenarioForm } from "./NewScenarioForm";

export const dynamic = "force-dynamic";

export default async function NewScenarioPage({ searchParams }: { searchParams: { agents?: string } }) {
  const agents = await api.agents();
  const preselected = (searchParams.agents ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  return <NewScenarioForm agents={agents} preselected={preselected} />;
}
