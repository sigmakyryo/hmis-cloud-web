"use client";

import { PhoneInput } from "react-international-phone";

import { cn } from "@/lib/utils";

import "react-international-phone/style.css";

type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
};

const phoneInputClassName =
  "h-full min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

const phoneCountryButtonClassName =
  "h-full shrink-0 border-0 bg-transparent px-3 shadow-none outline-none focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

export function PhoneNumberInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  className,
}: PhoneNumberInputProps) {
  return (
    <div
      className={cn(
        "customer-phone-input relative flex h-10 w-full rounded-lg bg-background shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-dash-border transition-shadow duration-100 ease-linear focus-within:ring-2 focus-within:ring-brand-primary",
        hasError &&
          "ring-destructive/40 focus-within:ring-destructive",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <PhoneInput
        defaultCountry="mw"
        preferredCountries={["mw"]}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="flex h-full w-full min-w-0"
        inputClassName={phoneInputClassName}
        countrySelectorStyleProps={{
          buttonClassName: phoneCountryButtonClassName,
          dropdownStyleProps: {
            className: "customer-phone-country-dropdown",
          },
        }}
        style={{
          width: "100%",
          height: "100%",
          ["--react-international-phone-border-color" as string]: "transparent",
          ["--react-international-phone-country-selector-border-color" as string]:
            "transparent",
        }}
      />
    </div>
  );
}
