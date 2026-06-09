"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Stubbed, passwordless "session" for the prototype. There is no backend yet —
 * the magic-link flow just writes a user into localStorage so the member area
 * unlocks and survives reloads and variant switches. Phase 2 replaces this with
 * a real Supabase session + the approval gate.
 */
export type SessionUser = {
  name: string;
  email: string;
  initials: string;
  tint: string;
};

const STORAGE_KEY = "pc-session";

type SessionContextValue = {
  user: SessionUser | null;
  /** False until localStorage has been read (avoids gating on a stale null). */
  ready: boolean;
  signIn: (info: { name?: string; email: string }) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = (parts[0] || "Y")[0];
  const second = parts[1] ? parts[1][0] : "";
  return (first + second).toUpperCase();
}

function persist(user: SessionUser | null) {
  try {
    if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage may be unavailable/blocked; the in-memory session still works
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: SessionUser | null;
    ready: boolean;
  }>({ user: null, ready: false });

  useEffect(() => {
    let user: SessionUser | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) user = JSON.parse(raw) as SessionUser;
    } catch {
      // ignore malformed/blocked storage
    }
    // Hydration-safe: the server and first client render show signed-out; we
    // only adopt the stored session after mount. Reading localStorage during
    // render would desync hydration, so this one-time setState is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ user, ready: true });
  }, []);

  const signIn = useCallback((info: { name?: string; email: string }) => {
    const name = info.name?.trim() || "You";
    const user: SessionUser = {
      name,
      email: info.email.trim(),
      initials: initialsFor(name),
      tint: "var(--ink-soft)",
    };
    persist(user);
    setState({ user, ready: true });
  }, []);

  const signOut = useCallback(() => {
    persist(null);
    setState({ user: null, ready: true });
  }, []);

  return (
    <SessionContext.Provider
      value={{ user: state.user, ready: state.ready, signIn, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
