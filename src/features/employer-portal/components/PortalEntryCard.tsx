import Image from "next/image";
import type { ReactNode } from "react";

import { appFont } from "@/lib/fonts";

type PortalEntryCardProps = {
  title: string;
  subtitle: string;
  logo?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  testId: string;
};

/** Default mark shown until a clinic uploads its own portal logo. */
function PortalStarMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#2b2f3a" />
      <path
        d="M32 12c1.6 9.2 4.6 14.4 8.7 16.6 3.1 1.7 6.7 2.6 11.3 3.4-9.6 1.6-15 4.7-17.3 9.1-1.7 3.2-2.4 7-2.7 11.9-1.6-9.2-4.6-14.4-8.7-16.6-3.1-1.7-6.7-2.6-11.3-3.4 9.6-1.6 15-4.7 17.3-9.1 1.7-3.2 2.4-7 2.7-11.9Z"
        fill="#d4d6db"
      />
      <path d="M32 24.5 35 29l4.5 3-4.5 3-3 4.5-3-4.5-4.5-3 4.5-3 3-4.5Z" fill="#f4f5f7" />
    </svg>
  );
}

/** Centered company portal card: soft gray page, rounded white card, circular logo. */
export function PortalEntryCard({ title, subtitle, logo, children, footer, testId }: PortalEntryCardProps) {
  return (
    <main
      className={`${appFont.className} flex min-h-svh items-center justify-center bg-[#ebebeb] px-4 py-10`}
      data-testid={testId}
    >
      <div className="w-full max-w-[462px] rounded-[28px] bg-white px-7 pt-7 pb-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_-20px_rgba(15,23,42,0.12)] sm:px-7">
        <div className="mx-auto h-[66px] w-[66px] overflow-hidden rounded-full">
          {logo ? (
            <Image src={logo} alt="" width={66} height={66} unoptimized className="h-full w-full object-cover" />
          ) : (
            <PortalStarMark />
          )}
        </div>
        <h1 className="mt-6 text-center text-[22px] leading-7 font-medium tracking-tight text-neutral-900">{title}</h1>
        <p className="mt-1 text-center text-[15px] leading-6 text-neutral-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 text-center text-[14px] text-neutral-500">{footer}</div> : null}
      </div>
    </main>
  );
}
