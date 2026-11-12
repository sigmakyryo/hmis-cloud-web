import type {
  InventoryProductMeta,
  LabConfigurationStatus,
} from "@/features/inventory/types/inventory.types";

export type CatalogProductType = "product" | "consu" | "service";

export type PayerAdvisory = {
  code: string;
  message: string;
};

export type CatalogProduct = {
  id?: number;
  uuid: string;
  name: string;
  display_name: string;
  default_code?: string | null;
  barcode?: string | null;
  list_price?: number | string | null;
  standard_price?: number | string | null;
  uom_name?: string | null;
  product_type?: CatalogProductType | null;
  product_type_label?: string | null;
  invoice_policy?: "order" | "delivery" | null;
  charge_occurrences?: number;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  active?: boolean;
  is_active?: boolean;
  metadata?: InventoryProductMeta | null;
  lab_configuration?: LabConfigurationStatus | null;
  lab_charge_type?: "individual" | "panel" | null;
  /** Present when listing with visit_uuid (order-time payer tariff checks). */
  payer_advisories?: PayerAdvisory[];
  payer_tariff?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type CatalogPricelist = {
  id?: number;
  uuid: string;
  name: string;
  is_active: boolean;
  currency_code: string;
  created_at?: string | null;
  created_by_name?: string | null;
  created_by_avatar_url?: string | null;
};

export type CatalogPricelistMembership = {
  uuid?: string;
  pricelist_uuid: string;
  pricelist_name?: string;
  product_uuid: string;
  product_name?: string;
  product_type?: string | null;
  product_type_label?: string | null;
  /** Display type for the products table (Medicine, Service, Procedure, …). */
  type_label?: string | null;
  type_category?: string | null;
  benefit_category?: string | null;
  benefit_category_name?: string | null;
  payer_tariff?: {
    source?: string;
    external_benefit_id?: string | null;
    allowed_genders?: string[];
    min_age_years?: number | null;
    max_age_years?: number | null;
    max_units?: number | null;
    frequency?: number | null;
    frequency_window_days?: number | null;
    requires_preauthorization?: boolean;
    amount_limit?: string | null;
    service_type?: string | null;
    version?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  is_drug?: boolean | null;
  is_procedure?: boolean | null;
  is_sundry?: boolean | null;
  is_lab_test?: boolean | null;
  is_radiology?: boolean | null;
  /** Snapshot of MASM Core tariff attributes persisted during payer sync. */
  masm_core?: Record<string, unknown> | null;
  tariff_code?: string | null;
  fixed_price?: number | string | null;
  min_quantity?: number | string | null;
  date_start?: string | null;
  date_end?: string | null;
  created_by_name?: string | null;
  created_by_avatar_url?: string | null;
};

export type CatalogPriceChange = {
  uuid: string;
  pricelist_uuid: string;
  pricelist_item_uuid?: string | null;
  product_uuid: string;
  action: "ADD" | "UPDATE" | "REMOVE";
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";
  old_price?: number | string | null;
  new_price?: number | string | null;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
};

export type CatalogPriceChangeMutationResult = {
  approval_required: boolean;
  change: CatalogPriceChange;
  record?: CatalogPricelistMembership;
  applied_payload?: Record<string, unknown>;
};

export type CatalogPricelistCopyJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "partially_completed"
  | "failed";

export type CatalogPricelistCopyJobItemStatus = "pending" | "succeeded" | "failed";

export type CatalogPricelistCopyJob = {
  uuid: string;
  status: CatalogPricelistCopyJobStatus;
  target_pricelist_uuid: string;
  source_pricelist_uuid: string;
  source_pricelist_name: string;
  total_items: number;
  succeeded_items: number;
  failed_items: number;
  failure_code?: string;
  failure_message?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CatalogPricelistCopyJobItem = {
  product_uuid: string;
  product_name: string;
  fixed_price: string;
  min_quantity: string;
  date_start?: string | null;
  date_end?: string | null;
  status: CatalogPricelistCopyJobItemStatus;
  error_code?: string;
  error_message?: string;
};

export type CatalogMasmCorePriceSyncChange = {
  product_uuid: string;
  product_name: string;
  tariff_code: string;
  old_price: string;
  new_price: string;
  status?: string;
};

export type CatalogMasmCorePriceSyncResult = {
  matched: number;
  updated: number;
  unchanged: number;
  missing_in_core: number;
  missing_tariff_code: number;
  approval_required: number;
  core_tariffs: number;
  provider_id: number | null;
  dry_run: boolean;
  changes: CatalogMasmCorePriceSyncChange[];
};

export type CatalogPricelistMasmCoreSyncJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type CatalogPricelistMasmCoreSyncOptions = {
  update_fixed_price?: boolean;
  update_name?: boolean;
  import_missing_tariffs?: boolean;
  update_validity?: boolean;
  date_start?: string | null;
  date_end?: string | null;
};

export type CatalogPricelistMasmCoreSyncJob = {
  uuid: string;
  status: CatalogPricelistMasmCoreSyncJobStatus;
  pricelist_uuid: string;
  provider_id: number;
  dry_run: boolean;
  matched: number;
  updated: number;
  unchanged: number;
  missing_in_core: number;
  missing_tariff_code: number;
  approval_required: number;
  core_tariffs: number;
  names_updated?: number;
  imported?: number;
  options?: CatalogPricelistMasmCoreSyncOptions;
  failure_code?: string | null;
  failure_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SyncCatalogMasmCorePricesPayload = {
  provider_id?: number;
  dry_run?: boolean;
  page_size?: number;
} & CatalogPricelistMasmCoreSyncOptions;

export type CatalogPricelistSettingsScheme = {
  uuid: string;
  name: string;
  code: string;
  company_name: string;
  is_active: boolean;
};

export type CatalogPricelistSettings = {
  pricelist_uuid: string;
  schemes: CatalogPricelistSettingsScheme[];
  core_provider_id: number | null;
  /** Display name for Sync with {Payer} when registry capability is on. */
  sync_payer_name?: string | null;
  /** Linked scheme company has platform-admin pricelist_sync capability. */
  has_pricelist_sync_capability?: boolean;
  /** Capability present and Core provider id can be resolved. */
  pricelist_sync_enabled?: boolean;
};

export type CatalogAuditEvent = {
  uuid: string;
  action: string;
  category?: string;
  message?: string;
  status?: string;
  actor_uuid?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  target_object_uuid?: string | null;
  metadata?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  created_at?: string;
};

export type StartCatalogPricelistCopyPayload = {
  source_pricelist_uuid: string;
};

export type CatalogApprovalConfiguration = {
  uuid: string;
  require_two_person_approval: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PricelistRuleType = "CO_PAYMENT" | "EXCESS" | "FORMULA";

export type CatalogPricelistRule = {
  uuid: string;
  name: string;
  scope_type: "ALL" | "PRODUCT";
  rule_types: PricelistRuleType[];
  client_liability_formula?: string | null;
  insurer_max_amount?: string | null;
  is_active: boolean;
  product_uuids?: string[];
  product_names?: string[];
};

export type CatalogPricelistRuleWritePayload = {
  name?: string;
  scope_type: "ALL" | "PRODUCT";
  rule_types: PricelistRuleType[];
  client_liability_formula?: string;
  insurer_max_amount?: string | null;
  is_active?: boolean;
  product_uuids?: string[];
};

export type CatalogProductImportJob = {
  uuid: string;
  original_filename: string;
  file_format: "csv" | "xlsx";
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  created_products: number;
  updated_products: number;
  failure_code?: string;
  failure_message?: string;
  created_at?: string;
  updated_at?: string;
};

export type CatalogListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: boolean;
  product_type?: string;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  default_code?: string;
  barcode?: string;
  include_inactive?: boolean;
  currency_code?: string;
  is_lab_test?: boolean;
  is_radiology?: boolean;
  is_procedure?: boolean;
  is_sundry?: boolean;
  is_drug?: boolean;
  /** Department context for procedure scope (opd | dental | ipd | physio). */
  procedure_context?: "opd" | "dental" | "ipd" | "theatre" | "physio";
  /** When set, attach visit-scoped payer_advisories from the effective pricelist. */
  visit_uuid?: string;
};

export type CreateCatalogProductPayload = {
  name: string;
  display_name?: string;
  default_code?: string;
  barcode?: string;
  list_price?: number;
  standard_price?: number;
  uom_name?: string;
  product_type?: CatalogProductType;
  invoice_policy?: "order" | "delivery";
  charge_occurrences?: number;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  active?: boolean;
  metadata?: InventoryProductMeta;
};

export type CreateCatalogPricelistPayload = {
  name: string;
  currency_code?: string;
  is_active?: boolean;
};

export type UpdateCatalogPricelistPayload = {
  name?: string;
  currency_code?: string;
  is_active?: boolean;
};

export type AddCatalogPricelistProductPayload = {
  product_uuid: string;
  fixed_price: number | string;
  min_quantity?: number | string;
  date_start?: string | null;
  date_end?: string | null;
};

export type UpdateCatalogPricelistProductPayload = {
  fixed_price?: number | string;
  min_quantity?: number | string;
  date_start?: string | null;
  date_end?: string | null;
  benefit_category?: string;
};

export type OrganizationDefaultPricelistUuid = {
  tenant_uuid: string;
  default_pricelist_uuid: string | null;
};

export type SetOrganizationDefaultPricelistUuidPayload = {
  default_pricelist_uuid: string | null;
};
