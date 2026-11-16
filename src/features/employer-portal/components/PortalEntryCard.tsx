import type { ReactNode } from "react";

import { appFont } from "@/lib/fonts";

type PortalEntryCardProps = {
  title: string;
  subtitle: string;
  logo?: string | null;
  children: ReactNode;
  testId: string;
};

/** Centered company portal card: gray page, white card, circular logo. */
export function PortalEntryCard({ title, subtitle, logo, children, testId }: PortalEntryCardProps) {
  return (
    <main
      className={`${appFont.className} flex min-h-svh items-center justify-center bg-[#f3f4f6] px-4 py-10`}
      data-testid={testId}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-10 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- clinic portal logo is a data URI
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-neutral-700">S</span>
          )}
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold text-neutral-900">{title}</h1>
        <p className="mt-1 text-center text-sm text-neutral-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
