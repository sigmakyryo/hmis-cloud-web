export type PayerAdvisoryLike = {
  code?: string;
  message?: string;
};

export function formatPayerAdvisoriesLine(
  advisories: PayerAdvisoryLike[] | null | undefined,
): string | null {
  if (!advisories?.length) {
    return null;
  }
  const messages = advisories
    .map((item) => (item.message || "").trim())
    .filter(Boolean);
  if (!messages.length) {
    return null;
  }
  return messages.join(" · ");
}
