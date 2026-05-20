"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Person } from "@/lib/types";

export interface UserColors {
  artem: string;
  alexa: string;
}

const DEFAULT_COLORS: UserColors = {
  artem: "#38bdf8",
  alexa: "#fb7185",
};

interface UserContextValue {
  user: Person;
  setUser: (u: Person) => void;
  colors: UserColors;
  setColor: (person: "artem" | "alexa", color: string) => void;
  accent: string;
}

const UserContext = createContext<UserContextValue>({
  user: "both",
  setUser: () => {},
  colors: DEFAULT_COLORS,
  setColor: () => {},
  accent: "#fbbf24",
});

function hexAlpha(hex: string, opacity: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function buildAccentCss(a: string) {
  return `
    .a-bg{background-color:${a}}
    .a-text{color:${a}}
    .a-border{border-color:${a}}
    .a-bg-10{background-color:${hexAlpha(a, 0.1)}}
    .a-bg-15{background-color:${hexAlpha(a, 0.15)}}
    .a-border-40{border-color:${hexAlpha(a, 0.4)}}
    .a-border-50{border-color:${hexAlpha(a, 0.5)}}
    .hover\\:a-bg-10:hover{background-color:${hexAlpha(a, 0.1)}}
    .focus\\:a-border-50:focus{border-color:${hexAlpha(a, 0.5)}}
  `;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<Person>("both");
  const [colors, setColors] = useState<UserColors>(DEFAULT_COLORS);

  useEffect(() => {
    const storedUser = localStorage.getItem("cwp_user") as Person | null;
    if (storedUser && ["artem", "alexa", "both"].includes(storedUser)) {
      setUserState(storedUser);
    }
    const storedColors = localStorage.getItem("cwp_colors");
    if (storedColors) {
      try { setColors(JSON.parse(storedColors)); } catch {}
    }
  }, []);

  const setUser = (u: Person) => {
    setUserState(u);
    localStorage.setItem("cwp_user", u);
  };

  const setColor = (person: "artem" | "alexa", color: string) => {
    const next = { ...colors, [person]: color };
    setColors(next);
    localStorage.setItem("cwp_colors", JSON.stringify(next));
  };

  const accent = useMemo(
    () => user === "artem" ? colors.artem : user === "alexa" ? colors.alexa : "#fbbf24",
    [user, colors]
  );

  return (
    <UserContext.Provider value={{ user, setUser, colors, setColor, accent }}>
      <style dangerouslySetInnerHTML={{ __html: buildAccentCss(accent) }} />
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
