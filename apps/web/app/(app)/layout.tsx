import { Shell } from "./components/Shell";
import { api } from "@/lib/api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Fetched here (not in Shell) so a down API degrades to a null config instead of
  // breaking every route - layout wraps every dashboard route.
  const engineConfig = await api.config().catch(() => null);

  return <Shell engineConfig={engineConfig}>{children}</Shell>;
}
