import Link from "next/link";

export function IntakeModeSwitch({ mode }: { mode: "self" | "bulk" }) {
  const tab = (href: string, active: boolean, label: string) => (
    <Link
      key={href}
      href={href}
      className={
        "px-[10px] py-[7px] rounded-[5px] text-[12.5px] font-semibold text-center " +
        (active ? "bg-forest text-paper" : "text-[#6E6A60] hover:text-forest")
      }
    >
      {label}
    </Link>
  );
  return (
    <div className="flex gap-[2px] p-[2px] bg-[#EDEAE2] rounded-[7px] w-fit">
      {tab("/interview", mode === "self", "Self-serve")}
      {tab("/bulk", mode === "bulk", "Generate cohort")}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#A8A296]">{children}</div>
  );
}

export function Pill({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return (
    <span
      className="px-2 py-[2px] rounded-[3px] text-[10.5px] font-semibold tracking-[0.05em] uppercase whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export const MEMORY_TYPE_PILL: Record<string, { bg: string; fg: string }> = {
  observation: { bg: "#EDEAE2", fg: "#6E6A60" },
  reflection: { bg: "#E8EFEA", fg: "#1F4436" },
  plan: { bg: "#F5EADF", fg: "#B25E12" },
};

export const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#1F4436",
  mixed: "#B25E12",
  negative: "#8C3A2E",
};

export const SENTIMENT_PILL: Record<string, { bg: string; fg: string }> = {
  positive: { bg: "#E8EFEA", fg: "#1F4436" },
  mixed: { bg: "#F5EADF", fg: "#B25E12" },
  negative: { bg: "#F3E3E0", fg: "#8C3A2E" },
};

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.round(hours / 24);
  if (days < 30) return days + "d ago";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function importanceStyle(imp: number): { bg: string; fg: string } {
  if (imp >= 9) return { bg: "#1F4436", fg: "#F7F5F0" };
  if (imp >= 7) return { bg: "#C3D5C9", fg: "#1F4436" };
  return { bg: "#EDEAE2", fg: "#8A8377" };
}
