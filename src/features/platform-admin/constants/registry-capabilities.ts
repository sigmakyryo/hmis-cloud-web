export const REGISTRY_CAPABILITIES = [
  {
    id: "member_search",
    label: "Member search",
    description: "Look up a member from a membership number.",
  },
  {
    id: "member_benefits",
    label: "Member benefits",
    description: "Read benefit limits for a member.",
  },
  {
    id: "claim_submit",
    label: "Automatic claim submission",
    description: "Submit a claim without a manual handoff.",
  },
  {
    id: "claim_close",
    label: "Close claim by invoice",
    description: "Close a claim when its invoice is settled.",
  },
  {
    id: "pricelist_sync",
    label: "Pricelist sync",
    description:
      "Sync prices, tariffs, and products from the payer into linked clinic pricelists.",
  },
] as const;

export const REGISTRY_PAYER_STATUSES = [
  { id: "approved", label: "Approved" },
  { id: "pending_approval", label: "Pending approval" },
  { id: "rejected", label: "Rejected" },
  { id: "retired", label: "Retired" },
] as const;
