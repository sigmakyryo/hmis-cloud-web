"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchPortalContacts,
  fetchPortalInvitations,
  fetchStaffPaymentNotices,
  fetchStaffPortalRequests,
} from "@/features/employer-portal/services/employer-portal.service";

/** Shared query keys: every tab reads and refreshes the same cache entries. */
export const EMPLOYERS_KEYS = {
  contacts: ["oh-portal-admin", "contacts"],
  invitations: ["oh-portal-admin", "invitations"],
  payments: ["oh-portal-admin", "payments"],
  requests: (status: string) => ["oh-portal-admin", "requests", status],
} as const;

export function useContactsQuery() {
  return useQuery({ queryKey: EMPLOYERS_KEYS.contacts, queryFn: fetchPortalContacts, retry: false });
}

export function useInvitationsQuery() {
  return useQuery({ queryKey: EMPLOYERS_KEYS.invitations, queryFn: fetchPortalInvitations, retry: false });
}

export function usePaymentNoticesQuery() {
  return useQuery({ queryKey: EMPLOYERS_KEYS.payments, queryFn: () => fetchStaffPaymentNotices("submitted"), retry: false });
}

export function useRequestsQuery(status: string) {
  return useQuery({ queryKey: EMPLOYERS_KEYS.requests(status), queryFn: () => fetchStaffPortalRequests(status), retry: false });
}
