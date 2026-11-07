import { Calendar, Hash, Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { PAGE_STAT_LABEL_CLASS } from "@/features/app-shell/components/page-layout";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  formatAdaptiveAge,
  formatDisplayDate,
} from "@/features/customers/utils/format-customer";

function OverviewFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className={PAGE_STAT_LABEL_CLASS}>{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-brand-navy">
        {children}
      </dd>
    </div>
  );
}

export function CustomerOverviewFacts({ customer }: { customer: Customer }) {
  const ageDisplay = formatAdaptiveAge(customer.dob);

  return (
    <dl
      className="-mx-4 -mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-dash-border px-4 py-4 sm:-mx-6 sm:grid-cols-4 sm:px-6"
      data-testid="customer-overview-facts"
      aria-label="Client details"
    >
      <OverviewFact label="Age">
        {ageDisplay}
        {customer.dob_is_estimated ? " (est.)" : ""}
      </OverviewFact>
      <OverviewFact label="Gender">{customer.gender}</OverviewFact>
      <OverviewFact label="Born">{formatDisplayDate(customer.dob)}</OverviewFact>
      <OverviewFact label="Phone">
        {customer.phone_number ? (
          <a
            href={`tel:${customer.phone_number}`}
            className="inline-flex items-center gap-1.5 hover:text-brand-primary"
          >
            <Phone className="size-3.5 text-dash-muted" aria-hidden="true" />
            {customer.phone_number}
          </a>
        ) : (
          "—"
        )}
      </OverviewFact>
      <OverviewFact label="Email">
        {customer.email ? (
          <a
            href={`mailto:${customer.email}`}
            className="inline-flex max-w-full items-center gap-1.5 hover:text-brand-primary"
          >
            <Mail className="size-3.5 shrink-0 text-dash-muted" aria-hidden="true" />
            <span className="truncate">{customer.email}</span>
          </a>
        ) : (
          "—"
        )}
      </OverviewFact>
      <OverviewFact label="Reference">
        {customer.internal_reference ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
            <Hash className="size-3.5 text-dash-muted" aria-hidden="true" />
            {customer.internal_reference}
          </span>
        ) : (
          "—"
        )}
      </OverviewFact>
      <OverviewFact label="Registered">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5 text-dash-muted" aria-hidden="true" />
          {formatDisplayDate(customer.created_at)}
        </span>
      </OverviewFact>
    </dl>
  );
}
