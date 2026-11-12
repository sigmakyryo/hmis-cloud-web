import type {
  TheatreCase,
  TheatreProcedureCodeRef,
  TheatreProcedureCodeSystem,
  TheatrePreferenceSetup,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

export type { TheatreCase, TheatreProcedureCodeRef, TheatreProcedureCodeSystem };

export type TheatrePriceSource = "pricelist" | "list_price" | "free_visit";

/** A procedure product from the catalogue, priced as billing would price it. */
export type TheatreProcedureProduct = {
  uuid: string;
  name: string;
  display_name: string;
  default_code: string;
  list_price: string;
  price: string;
  price_source: TheatrePriceSource;
  scope: "ipd_only_procedure" | "clinic_wide_procedure" | "";
  codes: TheatreProcedureCodeRef[];
};

export type TheatreProcedureCode = {
  uuid: string;
  system: TheatreProcedureCodeSystem;
  system_label: string;
  code: string;
  description: string;
  source: "sample" | "import" | "manual";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TheatreProcedureCodeFilters = {
  system?: TheatreProcedureCodeSystem | "";
  q?: string;
  includeInactive?: boolean;
};

export type TheatreProcedureCodeImportPayload = {
  system: TheatreProcedureCodeSystem;
  content: string;
  licence_confirmed?: boolean;
};

export type TheatreProcedureCodeImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ line: number; error: string }>;
  error_count: number;
};

export type TheatrePreferenceCardItem = {
  uuid: string;
  product_uuid: string;
  product_name: string;
  product_type: string;
  quantity: string;
  notes: string;
  sequence: number;
};

export type TheatrePreferenceCard = {
  uuid: string;
  title: string;
  surgeon_id: number;
  surgeon_name: string;
  product_uuid: string;
  product_name: string;
  positioning: string;
  skin_prep: string;
  equipment: string;
  instrument_trays: string[];
  notes: string;
  items: TheatrePreferenceCardItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TheatrePreferenceCardItemInput = {
  product: string;
  quantity: string | number;
  notes?: string;
};

export type TheatrePreferenceCardPayload = {
  surgeon?: number | null;
  product?: string;
  title?: string;
  positioning?: string;
  skin_prep?: string;
  equipment?: string;
  instrument_trays?: string[];
  notes?: string;
  items?: TheatrePreferenceCardItemInput[];
};

export type TheatrePlannedItemStatus = "planned" | "confirmed" | "dismissed";

export type TheatrePlannedItem = {
  uuid: string;
  product_uuid: string;
  product_name: string;
  quantity: string;
  notes: string;
  sequence: number;
  status: TheatrePlannedItemStatus;
  status_label: string;
  decided_by_name: string;
  decided_at: string | null;
  consumable_uuid: string | null;
};

export type TheatreCasePlannedItems = {
  preference_card_uuid: string | null;
  preference_card_title: string;
  applied_at: string | null;
  setup: TheatrePreferenceSetup;
  suggested_card_uuid: string | null;
  items: TheatrePlannedItem[];
  result?: { confirmed: number; errors: Array<{ item: string; error: string }> };
};

export type SaveTheatrePreferenceCardPayload = {
  surgeon?: number | null;
  positioning?: string;
  skin_prep?: string;
  equipment?: string;
  instrument_trays?: string[];
  notes?: string;
};
