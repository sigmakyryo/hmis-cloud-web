"use client";

import { Loading03Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";

import { PortalIcon } from "@/features/employer-portal/components/PortalIcon";

const inputClass =
  "h-[46px] w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-[15px] text-neutral-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-neutral-400 focus:border-[#3d63f3] focus:ring-4 focus:ring-[#3d63f3]/15 read-only:bg-neutral-50 read-only:text-neutral-500";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

type PortalFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "onChange"> & {
  id: string;
  label: string;
  onValueChange?: (value: string) => void;
};

export function PortalField({ id, label, onValueChange, ...input }: PortalFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[15px] font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        className={inputClass}
        onChange={(event) => onValueChange?.(event.target.value)}
        {...input}
      />
    </div>
  );
}

type PortalPasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
};

export function PortalPasswordField({ id, label, value, onValueChange, autoComplete, placeholder }: PortalPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[15px] font-medium text-neutral-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition hover:text-neutral-700"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
        >
          <PortalIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={18} />
        </button>
      </div>
    </div>
  );
}

type PortalSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Clinic accent colour (`#rrggbb`). Falls back to the portal blue. */
  accent?: string | null;
  /** Shows a spinner and blocks further clicks while the request is running. */
  loading?: boolean;
};

export function PortalSubmitButton({ accent, loading = false, disabled, className = "", children, ...button }: PortalSubmitButtonProps) {
  const custom = accent && HEX_COLOR.test(accent) ? accent : null;
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      aria-busy={loading}
      style={custom ? { backgroundColor: custom, backgroundImage: "none" } : undefined}
      className={`h-12 w-full rounded-xl bg-gradient-to-b from-[#4a78ff] to-[#2f55e8] text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(37,70,210,0.35)] transition hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...button}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {loading ? <PortalIcon icon={Loading03Icon} size={16} className="animate-spin" /> : null}
        {children}
      </span>
    </button>
  );
}

/** Stand-in for the card body while the clinic or invitation is being looked up. */
export function PortalFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <span className="block h-4 w-20 animate-pulse rounded bg-neutral-100" />
          <span className="block h-[46px] animate-pulse rounded-xl bg-neutral-100" />
        </div>
      ))}
      <span className="block h-12 animate-pulse rounded-xl bg-neutral-100" />
    </div>
  );
}
