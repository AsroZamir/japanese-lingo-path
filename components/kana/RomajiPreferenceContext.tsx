"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type RomajiPolicy = "always" | "on_demand" | "hidden";
export type GlobalRomajiPreference = RomajiPolicy | "follow_content";

type RomajiPreferenceValue = {
  preference: GlobalRomajiPreference;
  setPreference: (preference: GlobalRomajiPreference) => void;
};

const RomajiPreferenceContext = createContext<RomajiPreferenceValue | null>(null);

export function RomajiPreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<GlobalRomajiPreference>("follow_content");
  return (
    <RomajiPreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </RomajiPreferenceContext.Provider>
  );
}

const DEFAULT_VALUE: RomajiPreferenceValue = {
  preference: "follow_content",
  setPreference: () => {},
};

// Falls back to "follow_content" outside a provider (rather than
// throwing like useToast does) so RomajiText — mandated everywhere
// romaji appears — keeps working on pages that haven't wired the
// provider in yet, instead of crashing them.
export function useRomajiPreference() {
  return useContext(RomajiPreferenceContext) ?? DEFAULT_VALUE;
}
