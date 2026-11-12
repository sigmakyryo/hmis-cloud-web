export function formatClock(seconds?: number) {
  if (seconds == null) return "—";
  const overdue = seconds < 0;
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return overdue ? `${label} overdue` : `${label} left`;
}

