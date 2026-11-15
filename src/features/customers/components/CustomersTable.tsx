"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  Copy,
  HeartPulse,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";

import { HoverPreviewCard } from "@/components/hover-preview-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClientProfileAvatar } from "@/components/client-profile-avatar";
import { ROUTES } from "@/constants/routes";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";
import { CustomerVisitStatusBadge } from "@/features/customers/components/CustomerVisitStatusBadge";
import type { Customer } from "@/features/customers/types/customer.types";
import { isCustomerVisitActive } from "@/features/customers/utils/customer-visit-status";
import {
  formatCustomerListAge,
  formatCustomerName,
  formatDisplayDate,
} from "@/features/customers/utils/format-customer";
import {
  formatEmploymentClientMeta,
  formatEmploymentRoleLabel,
} from "@/features/customers/utils/employment-display";
import {
  isEmployeeBasedOrganization,
} from "@/features/settings/utils/organization-type";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

type CustomersTableProps = {
  customers: Customer[];
  onRowClick?: (customer: Customer) => void;
  onStartVisit?: (customer: Customer) => void;
  onBookAppointment?: (customer: Customer) => void;
  onEditCustomer?: (customer: Customer) => void;
  className?: string;
};

const BASE_COLUMNS = [
  { key: "client", label: "Client" },
  { key: "id", label: "Client ID / MRN" },
  { key: "visit_status", label: "Visit Status" },
  { key: "demographics", label: "Demographics" },
  { key: "created", label: "Registered" },
  { key: "actions", label: "Actions" },
] as const;

function buildColumns(employeeBased: boolean) {
  if (!employeeBased) {
    return [...BASE_COLUMNS];
  }
  return [
    BASE_COLUMNS[0],
    BASE_COLUMNS[1],
    { key: "type", label: "Type" },
    BASE_COLUMNS[2],
    BASE_COLUMNS[3],
    BASE_COLUMNS[4],
    BASE_COLUMNS[5],
  ] as const;
}

function CustomerHoverPreview({ customer }: { customer: Customer }) {
  const name = formatCustomerName(customer);
  const contact = customer.email?.trim() || customer.phone_number?.trim() || null;
  const contactIsEmail = Boolean(customer.email?.trim());

  return (
    <div className="overflow-hidden">
      <div className="space-y-3 px-4 pb-3 pt-4">
        <div className="flex items-start gap-3">
          <ClientProfileAvatar
            seed={customer.uuid || customer.customer_identifier || name}
            name={name}
            photoUrl={customer.photo_url}
            className="size-10 shrink-0 rounded-[0.7rem]"
            fallbackClassName="rounded-[0.7rem]"
          />
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-[14px] font-semibold leading-tight text-brand-navy">
              {name}
            </p>
            <p className="mt-0.5 text-[12px] leading-tight text-dash-muted">
              Client
            </p>
          </div>
        </div>

        {contact ? (
          <p className="flex min-w-0 items-center gap-2 text-[12.5px] text-brand-slate">
            {contactIsEmail ? (
              <Mail className="size-3.5 shrink-0 text-dash-muted" aria-hidden />
            ) : (
              <Phone className="size-3.5 shrink-0 text-dash-muted" aria-hidden />
            )}
            <span className="truncate">{contact}</span>
          </p>
        ) : null}
      </div>

      <div className="border-t border-dash-border/70" aria-hidden="true" />

      <dl className="space-y-2.5 px-4 py-3 text-[12.5px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-dash-muted">Visit status</dt>
          <dd className="shrink-0">
            <CustomerVisitStatusBadge
              status={customer.visit_status}
              lastVisitAt={customer.last_visit_at}
            />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-dash-muted">Client ID</dt>
          <dd className="truncate font-medium text-brand-navy">
            {customer.customer_identifier || "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-dash-muted">Gender</dt>
          <dd className="font-medium text-brand-navy">{customer.gender || "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-dash-muted">Age</dt>
          <dd className="font-medium text-brand-navy">
            {formatCustomerListAge(customer) ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="border-t border-dash-border/70" aria-hidden="true" />

      <div className="flex justify-end px-4 py-2.5">
        <Link
          href={ROUTES.customerDetail(customer.uuid)}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-navy/80 transition-colors hover:text-brand-primary"
        >
          View client
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export function CustomersTable({
  customers,
  onRowClick,
  onStartVisit,
  onBookAppointment,
  onEditCustomer,
  className,
}: CustomersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userData } = useUser();
  const employeeBased = isEmployeeBasedOrganization(userData?.tenant);
  const organizationName = userData?.tenant?.name?.trim() || null;
  const columns = buildColumns(employeeBased);
  const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

  const handleCopyMrn = (event: React.MouseEvent, customer: Customer) => {
    event.stopPropagation();
    const identifier = customer.customer_identifier || customer.uuid;
    if (identifier) {
      void navigator.clipboard.writeText(identifier);
      setCopiedUuid(customer.uuid);
      setTimeout(() => setCopiedUuid(null), 2000);
      toast({
        variant: "success",
        title: "MRN copied",
        description: `${identifier} copied to clipboard.`,
      });
    }
  };

  const handleVisitAction = (customer: Customer) => {
    if (onStartVisit) {
      onStartVisit(customer);
      return;
    }
    router.push(ROUTES.customerDetail(customer.uuid));
  };

  const handleBookAppointment = (customer: Customer) => {
    if (onBookAppointment) {
      onBookAppointment(customer);
      return;
    }
    router.push(ROUTES.appointments);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <ListPageDataTable className={cn("h-full min-h-0", className)} scrollRows>
        <ListPageDataTableHeader sticky>
          <ListPageDataTableHeaderRow>
            {columns.map((column) => (
              <ListPageDataTableHeaderCell
                key={column.key}
                className={cn(
                  "sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_var(--color-dash-border)]",
                  column.key === "actions" && "pr-4 text-right",
                )}
              >
                {column.label}
              </ListPageDataTableHeaderCell>
            ))}
          </ListPageDataTableHeaderRow>
        </ListPageDataTableHeader>
        <ListPageDataTableBody>
          {customers.map((customer) => {
            const name = formatCustomerName(customer);
            const identifier = customer.customer_identifier || "—";
            const isVisitActive = isCustomerVisitActive(customer.visit_status);
            const isCopied = copiedUuid === customer.uuid;
            const listAge = formatCustomerListAge(customer);
            const employmentMeta = employeeBased
              ? formatEmploymentClientMeta({
                  employment: customer.employment,
                  internal_reference: customer.internal_reference,
                  organizationName,
                })
              : null;
            const employmentTypeLabel = employeeBased
              ? formatEmploymentRoleLabel(customer.employment?.role)
              : null;

            return (
              <ListPageDataTableRow
                key={customer.uuid}
                className="group cursor-pointer"
                onClick={() => onRowClick?.(customer)}
              >
                <ListPageDataTableCell>
                  <HoverPreviewCard
                    className="w-[17.5rem] p-0"
                    trigger={
                      <div className="flex min-w-0 items-center gap-2">
                        <ClientProfileAvatar
                          seed={customer.uuid || identifier || name}
                          name={name}
                          photoUrl={customer.photo_url}
                          className="size-6 shrink-0 rounded-md"
                          fallbackClassName="rounded-md"
                        />
                        <div className="min-w-0">
                          <Link
                            href={ROUTES.customerDetail(customer.uuid)}
                            className="block truncate text-[13px] font-medium text-brand-navy transition-colors group-hover:text-brand-primary"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-dash-muted">
                            {employeeBased ? (
                              employmentMeta ? (
                                <span className="truncate">{employmentMeta}</span>
                              ) : (
                                <span className="text-dash-muted">
                                  No employer / employee number
                                </span>
                              )
                            ) : customer.phone_number ? (
                              <span>{customer.phone_number}</span>
                            ) : customer.email ? (
                              <span className="truncate">{customer.email}</span>
                            ) : (
                              <span className="text-dash-muted">No phone / email</span>
                            )}
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <CustomerHoverPreview customer={customer} />
                  </HoverPreviewCard>
                </ListPageDataTableCell>

                <ListPageDataTableCell>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[13px] font-normal tracking-tight text-brand-navy">
                      {identifier}
                    </span>
                    {customer.customer_identifier ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => handleCopyMrn(e, customer)}
                            className="rounded p-1 text-dash-muted opacity-0 transition-all hover:bg-slate-100 hover:text-brand-navy group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label="Copy MRN"
                          >
                            {isCopied ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {isCopied ? "Copied!" : "Copy MRN"}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </ListPageDataTableCell>

                {employeeBased ? (
                  <ListPageDataTableCell>
                    <span className="text-[13px] text-brand-navy">
                      {employmentTypeLabel ?? "—"}
                    </span>
                  </ListPageDataTableCell>
                ) : null}

                <ListPageDataTableCell>
                  <CustomerVisitStatusBadge
                    status={customer.visit_status}
                    lastVisitAt={customer.last_visit_at}
                  />
                </ListPageDataTableCell>

                <ListPageDataTableCell>
                  <div className="font-medium text-brand-navy">
                    <span>{customer.gender || "—"}</span>
                    {listAge ? (
                      <span className="font-normal text-dash-muted">
                        {" "}
                        · {listAge}
                      </span>
                    ) : null}
                  </div>
                </ListPageDataTableCell>

                <ListPageDataTableCell className="tabular-nums text-dash-muted">
                  {formatDisplayDate(customer.created_at)}
                </ListPageDataTableCell>

                <ListPageDataTableCell className="pr-4 text-right">
                  <div
                    className="flex items-center justify-end gap-1.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {isVisitActive ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md border-red-200 bg-white px-2.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => handleVisitAction(customer)}
                      >
                        Close visit
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-md border-dash-border bg-white px-2.5 text-xs font-medium text-brand-navy hover:bg-dash-canvas"
                        onClick={() => handleVisitAction(customer)}
                      >
                        Start visit
                      </Button>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7.5 rounded-lg text-dash-muted hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => handleBookAppointment(customer)}
                          aria-label="Book appointment"
                        >
                          <CalendarPlus className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Book appointment</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7.5 rounded-lg text-dash-muted hover:bg-slate-100 hover:text-brand-navy"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(ROUTES.customerDetail(customer.uuid))
                          }
                        >
                          <User className="size-4" />
                          <span>View client</span>
                        </DropdownMenuItem>
                        {onEditCustomer ? (
                          <DropdownMenuItem onClick={() => onEditCustomer(customer)}>
                            <Pencil className="size-4 text-amber-600" />
                            <span>Edit demographics</span>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleVisitAction(customer)}>
                          <HeartPulse className="size-4 text-emerald-600" />
                          <span>{isVisitActive ? "Close visit" : "Start visit"}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBookAppointment(customer)}
                        >
                          <CalendarPlus className="size-4 text-blue-600" />
                          <span>Book appointment</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleCopyMrn(e, customer)}
                          disabled={!customer.customer_identifier}
                        >
                          <Copy className="size-4" />
                          <span>Copy MRN / ID</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </ListPageDataTableCell>
              </ListPageDataTableRow>
            );
          })}
        </ListPageDataTableBody>
      </ListPageDataTable>
    </TooltipProvider>
  );
}
