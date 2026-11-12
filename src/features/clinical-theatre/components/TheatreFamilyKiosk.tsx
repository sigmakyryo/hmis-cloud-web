"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchPublicTheatreBoard } from "@/features/clinical-theatre/services/theatre-p4.service";
import type { TheatrePublicFamilyBoard } from "@/features/clinical-theatre/types/theatre-p4.types";
import { FAMILY_STAGE_STYLES } from "@/features/clinical-theatre/utils/theatre-p4-display";

const PAGE_SIZE = 24;
const PAGE_SECONDS = 12;
const DEFAULT_REFRESH = 30;

type LoadState = "loading" | "ready" | "invalid" | "offline";

/** Full-screen family status board for waiting-area TVs. */
export function TheatreFamilyKiosk({ token }: { token: string }) {
  const [board, setBoard] = useState<TheatrePublicFamilyBoard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const data = await fetchPublicTheatreBoard(token);
      setBoard(data);
      setState("ready");
    } catch (error) {
      const status = (error as { status?: number }).status;
      // Why: keep showing the last board through network blips; only a
      // rejected link (404) clears the screen.
      setState(status === 404 ? "invalid" : "offline");
      if (status === 404) setBoard(null);
    }
  }, [token]);

  const refreshSeconds = Math.max(10, board?.refresh_seconds ?? DEFAULT_REFRESH);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state === "invalid") return undefined;
    const timer = window.setInterval(() => void load(), refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [load, refreshSeconds, state]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const entries = useMemo(() => board?.entries ?? [], [board]);
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  useEffect(() => {
    if (pages <= 1) {
      setPage(0);
      return undefined;
    }
    const timer = window.setInterval(() => setPage((current) => (current + 1) % pages), PAGE_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [pages]);

  const visible = entries.slice((page % pages) * PAGE_SIZE, (page % pages + 1) * PAGE_SIZE);

  const goFullscreen = () => {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      void root.requestFullscreen().catch(() => undefined);
    }
  };

  if (state === "invalid") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-center text-white">
        <div>
          <h1 className="text-4xl font-semibold">This status board link is not active</h1>
          <p className="mt-4 text-2xl text-slate-300">Please ask a member of staff for help.</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-slate-950 p-6 text-white md:p-10"
      data-testid="theatre-family-kiosk"
      onDoubleClick={goFullscreen}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold md:text-6xl">{board?.title || "Theatre patient status"}</h1>
          <p className="mt-2 text-xl text-slate-300 md:text-2xl">
            Find your patient code to see their progress.
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold tabular-nums md:text-5xl">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          {state === "offline" ? (
            <p className="text-lg text-amber-300">Reconnecting… showing last update</p>
          ) : pages > 1 ? (
            <p className="text-lg text-slate-400">
              Page {(page % pages) + 1} of {pages}
            </p>
          ) : null}
        </div>
      </header>

      {state === "loading" && !board ? (
        <p className="text-3xl text-slate-300">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-3xl text-slate-300">No patients to show right now.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-live="polite">
          {visible.map((entry, index) => (
            <li
              key={`${entry.code}-${index}`}
              className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900 px-6 py-5"
            >
              <span className="font-mono text-4xl font-bold tracking-wider md:text-5xl">{entry.code}</span>
              <span
                className={`rounded-full px-4 py-2 text-xl font-semibold md:text-2xl ${FAMILY_STAGE_STYLES[entry.stage] ?? "bg-slate-200 text-slate-900"}`}
              >
                {entry.stage_label}
              </span>
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-8 text-base text-slate-500">
        Updates every {refreshSeconds} seconds · double-click for full screen
      </footer>
    </main>
  );
}
