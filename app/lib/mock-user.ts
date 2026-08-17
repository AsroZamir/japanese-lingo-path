export type MockUser = {
  name: string;
  initials: string;
  level: string;
  nativeLanguage: string;
  goal: string;
};

/**
 * Single source of truth for the current (mock) learner. Every place in the
 * UI that used to hardcode "Asro" reads from here instead, so this is the
 * one spot that needs to change when real auth/account data lands.
 */
export const mockUser: MockUser = {
  name: "Asro",
  initials: "AR",
  level: "Pemula · Pre-N5",
  nativeLanguage: "Indonesian",
  goal: "General Japanese",
};
