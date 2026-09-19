"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EngineConfig } from "@/lib/api";

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "flex items-center justify-between gap-2 w-full text-left px-2 py-[7px] rounded-[5px] text-[13px] " +
        (active ? "bg-forest-tint text-forest font-semibold" : "text-[#4A463E] font-medium hover:bg-forest-tint")
      }
    >
      {children}
    </Link>
  );
}

export function Shell({
  children,
  engineConfig,
}: {
  children: React.ReactNode;
  engineConfig: EngineConfig | null;
}) {
  const pathname = usePathname();
  const isAgents = pathname === "/agents" || pathname?.startsWith("/agents/");
  const isInterview = pathname?.startsWith("/interview") || pathname?.startsWith("/bulk");
  const isScenario = pathname?.startsWith("/scenario");
  const isResults = pathname === "/results" || pathname?.startsWith("/runs/");

  return (
    <div className="grid min-h-screen bg-paper" style={{ gridTemplateColumns: "216px 1fr" }}>
      <nav className="border-r border-rule py-[22px] pb-6 flex flex-col gap-7 sticky top-0 h-screen bg-[#F4F2EC]">
        <div className="px-[18px] flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] border-[1.5px] border-forest rounded-full flex items-center justify-center">
              <div className="w-[6px] h-[6px] bg-forest rounded-full" />
            </div>
            <span className="text-[15px] font-bold tracking-[-0.02em]">Sim0</span>
          </div>
          <span className="text-[10px] text-[#8A8377] tracking-[0.055em] uppercase pl-[26px] leading-[1.4]">
            Simulate zero data debt
          </span>
        </div>

        <div className="flex flex-col gap-0.5 px-[10px]">
          <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#A8A296] px-2 pb-[7px]">Panel</div>
          <NavLink href="/agents" active={!!isAgents}>
            <span>Agents</span>
          </NavLink>
          <NavLink href="/interview" active={!!isInterview}>
            <span>Interview intake</span>
          </NavLink>
          <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#A8A296] pt-[18px] px-2 pb-[7px]">
            Simulate
          </div>
          <NavLink href="/scenario/new" active={!!isScenario}>
            <span>New scenario</span>
          </NavLink>
          <NavLink href="/results" active={!!isResults}>
            <span>Results</span>
          </NavLink>
        </div>

        <div className="mt-auto px-[18px] pt-[14px] border-t border-rule flex flex-col gap-[6px]">
          <div className="text-[10px] tracking-[0.08em] uppercase text-[#A8A296]">Engine</div>
          <div className="flex flex-col gap-[3px] text-[11px] text-[#6E6A60] leading-[1.5]">
            {engineConfig ? (
              <>
                <div>{engineConfig.llm_model}</div>
                <div>{engineConfig.embedding_model}</div>
              </>
            ) : (
              <div className="text-[#B25E12]">API not reachable</div>
            )}
          </div>
          <Link href="/logout" className="text-[11px] text-[#8A8377] hover:text-forest pt-[6px]">
            Log out
          </Link>
        </div>
      </nav>

      <main className="min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
