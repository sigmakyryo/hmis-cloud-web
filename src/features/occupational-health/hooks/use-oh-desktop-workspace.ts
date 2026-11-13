"use client";

import { useEffect, useState } from "react";

/**
 * True on the desktop split layout (lg: 1024px). Defaults to desktop so tests
 * and the first paint see a single set of journey and tool buttons.
 *
 * jsdom's matchMedia typically always returns `matches: false` even when
 * `innerWidth` is 1024; we ignore that stub so tests keep the desktop rail.
 */
export function useOhDesktopWorkspace(breakpointPx = 1024): boolean {
  const [desktop, setDesktop] = useState(true);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const media = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const width = window.innerWidth;
    const stubbedMobile = !width || (!media.matches && width >= breakpointPx);
    if (stubbedMobile) {
      return;
    }
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpointPx]);

  return desktop;
}
