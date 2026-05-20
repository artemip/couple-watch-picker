"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useUser } from "@/components/providers";
import type { Person } from "@/lib/types";

const PALETTE = [
  "#f87171", "#fb923c", "#fbbf24", "#a3e635",
  "#4ade80", "#2dd4bf", "#38bdf8", "#818cf8",
  "#c084fc", "#f472b6", "#fb7185", "#e2e8f0",
];

const NAV_ITEMS = [
  { href: "/", label: "Tonight", icon: SparkleIcon },
  { href: "/watchlist", label: "Watchlist", icon: BookmarkIcon },
  { href: "/history", label: "History", icon: ClockIcon },
];

export function Header() {
  const { user, setUser, colors, setColor } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const activeColor = user === "artem" ? colors.artem : user === "alexa" ? colors.alexa : null;

  return (
    <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between px-4 border-b border-white/8 bg-zinc-950/90 backdrop-blur-sm">
      <span className="text-sm font-semibold tracking-tight text-zinc-50">WatchPicker</span>

      <div ref={ref} className="relative">
        {/* Profile pill */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1.5 pr-3 py-1 transition-colors hover:bg-white/10 active:bg-white/15"
        >
          <AvatarStack colors={colors} active={user} />
          <span className="text-xs font-medium text-zinc-300">
            {user === "both" ? "A & A" : user === "artem" ? "Artem" : "Alexa"}
          </span>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5}
            className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-10 w-64 rounded-[24px] border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden">
            {/* Both option */}
            <button
              onClick={() => { setUser("both"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/6"
            >
              <AvatarStack colors={colors} active="both" size="sm" />
              <span className="text-sm text-zinc-200 flex-1 text-left">Both</span>
              {user === "both" && <CheckIcon />}
            </button>

            {/* Artem row */}
            <PersonRow
              person="artem"
              name="Artem"
              color={colors.artem}
              active={user === "artem"}
              onSelect={() => { setUser("artem"); setOpen(false); }}
              onColorPick={(c) => setColor("artem", c)}
            />

            {/* Alexa row */}
            <PersonRow
              person="alexa"
              name="Alexa"
              color={colors.alexa}
              active={user === "alexa"}
              onSelect={() => { setUser("alexa"); setOpen(false); }}
              onColorPick={(c) => setColor("alexa", c)}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function AvatarStack({
  colors,
  active,
  size = "md",
}: {
  colors: { artem: string; alexa: string };
  active: Person;
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  const artemOpacity = active === "alexa" ? "opacity-40" : "opacity-100";
  const alexaOpacity = active === "artem" ? "opacity-40" : "opacity-100";

  return (
    <div className="flex items-center">
      <div
        className={`${sz} ${artemOpacity} rounded-full flex items-center justify-center font-bold text-black transition-opacity z-10 ring-1 ring-zinc-950`}
        style={{ backgroundColor: colors.artem }}
      >
        A
      </div>
      <div
        className={`${sz} ${alexaOpacity} rounded-full flex items-center justify-center font-bold text-black transition-opacity -ml-1.5 ring-1 ring-zinc-950`}
        style={{ backgroundColor: colors.alexa }}
      >
        A
      </div>
    </div>
  );
}

function PersonRow({
  person,
  name,
  color,
  active,
  onSelect,
  onColorPick,
}: {
  person: "artem" | "alexa";
  name: string;
  color: string;
  active: boolean;
  onSelect: () => void;
  onColorPick: (c: string) => void;
}) {
  return (
    <div className="border-b border-white/6 last:border-0">
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black ring-1 ring-zinc-950 shrink-0"
          style={{ backgroundColor: color }}
        >
          {name[0]}
        </div>
        <span className="text-sm text-zinc-200 flex-1 text-left">{name}</span>
        {active && <CheckIcon />}
      </button>

      {/* Color palette */}
      <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onColorPick(c)}
            className="w-5 h-5 rounded-full transition-all hover:scale-110 active:scale-95"
            style={{
              backgroundColor: c,
              outline: color === c ? `2px solid ${c}` : "none",
              outlineOffset: "2px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="text-zinc-400 shrink-0">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { user, colors } = useUser();
  const activeColor = user === "artem" ? colors.artem : user === "alexa" ? colors.alexa : "#fbbf24";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-white/8 bg-zinc-950/90 backdrop-blur-sm pb-safe">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-w-16 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              active ? "" : "text-zinc-500 hover:text-zinc-300"
            }`}
            style={active ? { color: activeColor } : undefined}
          >
            <Icon active={active} color={active ? activeColor : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SparkleIcon({ active, color }: { active: boolean; color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke={active ? (color ?? "#fbbf24") : "currentColor"}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function BookmarkIcon({ active, color }: { active: boolean; color?: string }) {
  const c = active ? (color ?? "#fbbf24") : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? c : "none"} strokeWidth={1.75} stroke={c}>
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-8-4-8 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon({ active, color }: { active: boolean; color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke={active ? (color ?? "#fbbf24") : "currentColor"}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
