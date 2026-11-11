const STORAGE_KEY = "oh-recent-pages:v1";
const CHANGE_EVENT = "oh-recent-pages-change";
const MAX_RECENT = 5;

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    // Why: storage throws in private mode or when disabled; recents are optional.
    return "[]";
  }
}

/** Parse the stored list, ignoring anything that is not a list of strings. */
export function parseOhRecentPages(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Move the href to the front of the recent list. */
export function recordOhRecentPage(href: string): void {
  const next = [href, ...parseOhRecentPages(readRaw()).filter((item) => item !== href)].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Why: storage throws in private mode or when full; recents are optional.
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeOhRecentPages(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function getOhRecentPagesSnapshot(): string {
  return readRaw();
}

export function getOhRecentPagesServerSnapshot(): string {
  return "[]";
}
