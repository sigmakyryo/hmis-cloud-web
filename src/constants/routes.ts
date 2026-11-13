export const ROUTES = {
  home: "/",
  auth: "/auth",
  signup: "/auth/register",
  register: "/auth/register",
  onboarding: "/onboarding",
  platformAdmin: "/platform-admin",
  platformAdminTenants: "/platform-admin/tenants",
  platformAdminTenant: (tenantUuid: string) =>
    `/platform-admin/tenants/${tenantUuid}`,
  platformAdminFinance: "/platform-admin/finance",
  platformAdminBackups: "/platform-admin/backups",
  platformAdminBackupsHmis: "/platform-admin/backups/hmis",
  platformAdminBackupsClaimsEngine: "/platform-admin/backups/claims-engine",
  platformAdminPayerRegistry: "/platform-admin/payer-registry",
  platformAdminBlog: "/platform-admin/blog",
  platformAdminBlogPosts: "/platform-admin/blog/posts",
  platformAdminBlogPost: (postId: string) =>
    `/platform-admin/blog/posts/${postId}`,
  platformAdminBlogAuthors: "/platform-admin/blog/authors",
  platformAdminBlogCategories: "/platform-admin/blog/categories",
  platformAdminBlogTags: "/platform-admin/blog/tags",
  platformAdminBlogSettings: "/platform-admin/blog/settings",
  platformAdminResourcesSales: "/platform-admin/resources/sales",
  platformAdminSalesPlaybook: "/platform-admin/resources/sales/playbook",
  customers: "/customers",
  /** Clinic home workspace. */
  overview: "/overview",
  /** Default destination after successful sign-in / sign-up. */
  postAuth: "/overview",
  contacts: "/contacts",
  ourProducts: "/our-products",
  pricing: "/pricing",
  about: "/about",
  features: "/features",
  services: "/services",
  solutions: "/solutions",
  solutionsBilling: "/solutions/billing",
  solutionsClaims: "/solutions/claims",
  solutionsPayments: "/solutions/payments",
  customerDetail: (customerId: string) => `/customers/${customerId}`,
  customerDetailTab: (customerId: string, tab?: string) =>
    tab && tab !== "summary"
      ? `/customers/${customerId}/${tab}`
      : `/customers/${customerId}`,
  labOrders: "/lab-orders",
  labOrderDetail: (uuid: string) => `/lab-orders/${uuid}`,
  labOrderDetailTab: (uuid: string, tab?: string) =>
    tab && tab !== "overview"
      ? `/lab-orders/${uuid}/${tab}`
      : `/lab-orders/${uuid}`,
  labSpecimenTypes: "/lab/specimen-types",
  labAnalytes: "/lab/analytes",
  labTests: "/lab/tests",
  labTestDetail: (uuid: string) => `/lab/tests/${uuid}`,
  labTestDetailTab: (uuid: string, tab?: string) =>
    tab && tab !== "summary"
      ? `/lab/tests/${uuid}/${tab}`
      : `/lab/tests/${uuid}`,
  labPanels: "/lab/panels",
  labPanelDetail: (uuid: string) => `/lab/panels/${uuid}`,
  labPanelDetailTab: (uuid: string, tab?: string) =>
    tab && tab !== "overview"
      ? `/lab/panels/${uuid}/${tab}`
      : `/lab/panels/${uuid}`,
  labReferenceRanges: "/lab/reference-ranges",
  /** Laboratory settings live under Settings → Modules. */
  labSettings: "/settings/modules/laboratory",
  salesOrders: "/sales-orders",
  salesOrderDetail: (orderId: number | string) => `/sales-orders/${orderId}`,
  invoices: "/invoices",
  invoiceDetail: (invoiceId: number | string) => `/invoices/${invoiceId}`,
  receivables: "/receivables",
  claims: "/claims",
  notifications: "/notifications",
  claimDetail: (claimId: number | string) => `/claims/${claimId}`,
  claimDetailTab: (
    claimId: number | string,
    tab: "claim" | "items" | "odontogram" | "reference" | "activity",
  ) => (tab === "claim" ? `/claims/${claimId}` : `/claims/${claimId}/${tab}`),
  claimsRemittances: "/claims/remittances",
  remittanceDetail: (batchId: number | string) =>
    `/claims/remittances/${batchId}`,
  claimsReconciliations: "/claims/reconciliations",
  claimsRejections: "/claims/rejections",
  claimsAppeals: "/claims/appeals",
  payments: "/payments",
  paymentDetail: (paymentId: number | string) => `/payments/${paymentId}`,
  therapyPhysio: "/therapy/physio",
  therapySpeech: "/therapy/speech",
  therapyOccupational: "/therapy/occupational",
  therapyVisitDetail: (discipline: string, visitUuid: string) =>
    `/therapy/${discipline}/${visitUuid}`,
  inventoryStock: "/inventory/stock",
  inventoryStockDetail: (uuid: string) => `/inventory/stock/${uuid}`,
  inventoryProducts: "/inventory/products",
  inventoryProductDetail: (productUuid: string) =>
    `/inventory/products/${productUuid}`,
  inventoryPricelists: "/inventory/pricelists",
  inventoryPricelistDetail: (pricelistUuid: string) =>
    `/inventory/pricelists/${pricelistUuid}`,
  inventoryPurchaseOrders: "/inventory/purchase-orders",
  inventoryPurchaseOrderDetail: (uuid: string) =>
    `/inventory/purchase-orders/${uuid}`,
  inventoryInternalOrders: "/inventory/internal-orders",
  inventoryInternalOrderDetail: (uuid: string) =>
    `/inventory/internal-orders/${uuid}`,
  inventoryStockAdjustments: "/inventory/stock-adjustments",
  inventoryStockAdjustmentDetail: (uuid: string) =>
    `/inventory/stock-adjustments/${uuid}`,
  inventoryMovements: "/inventory/movements",
  inventoryMovementDetail: (uuid: string) => `/inventory/movements/${uuid}`,
  inventoryBatches: "/inventory/batches",
  inventoryBatchDetail: (uuid: string) => `/inventory/batches/${uuid}`,
  inventoryBatchNew: "/inventory/batches/new",
  pharmacyQueue: "/pharmacy/queue",
  pharmacyQueueDetail: (salesOrderUuid: string) =>
    `/pharmacy/queue/${salesOrderUuid}`,
  pharmacyHistory: "/pharmacy/history",
  activeVisits: "/active-visits",
  referrals: "/referrals",
  appointments: "/appointments",
  appointmentsBoard: "/appointments/board",
  appointmentsCalendar: "/appointments/calendar",
  clinicalOpd: "/clinical/opd",
  clinicalDental: "/clinical/dental",
  clinicalDentalEncounter: (visitUuid: string, encounterUuid: string) =>
    `/clinical/dental/${visitUuid}/${encounterUuid}`,
  clinicalIpd: "/clinical/ipd",
  clinicalIpdBoard: "/clinical/ipd/board",
  clinicalIpdBeds: "/clinical/ipd/beds",
  clinicalIpdAdmit: "/clinical/ipd/admit",
  clinicalIpdStays: "/clinical/ipd/stays",
  clinicalIpdEncounter: (visitUuid: string, encounterUuid: string) =>
    `/clinical/ipd/${visitUuid}/${encounterUuid}`,
  clinicalTheatre: "/clinical/theatre",
  clinicalTheatreBoard: "/clinical/theatre/board",
  clinicalTheatreReports: "/clinical/theatre/reports",
  clinicalTheatreWaitingList: "/clinical/theatre/waiting-list",
  clinicalTheatrePreOpClinic: "/clinical/theatre/pre-op-clinic",
  clinicalTheatreCssd: "/clinical/theatre/cssd",
  clinicalTheatreImplants: "/clinical/theatre/implants",
  clinicalTheatreFamilyBoard: "/clinical/theatre/family-board",
  theatreFamilyKiosk: (token: string) => `/theatre-board/${encodeURIComponent(token)}`,
  clinicalTheatreEncounter: (visitUuid: string, encounterUuid: string) =>
    `/clinical/theatre/${visitUuid}/${encounterUuid}`,
  occupationalHealth: "/occupational-health",
  occupationalHealthHome: "/occupational-health/home",
  occupationalHealthEmployees: "/occupational-health/employees",
  occupationalHealthEmployee: (customerUuid: string) =>
    `/occupational-health/employees/${customerUuid}`,
  occupationalHealthInjuries: "/occupational-health/injuries",
  occupationalHealthForms: "/occupational-health/forms",
  occupationalHealthImmunizations: "/occupational-health/immunizations",
  immunizations: "/immunizations",
  immunizationsDue: "/immunizations/due",
  immunizationsVaccines: "/immunizations/vaccines",
  immunizationsSchedules: "/immunizations/schedules",
  immunizationsCompliance: "/immunizations/compliance",
  immunizationsRisk: "/immunizations/risk",
  immunizationsExposures: "/immunizations/exposures",
  immunizationsGovernance: "/immunizations/governance",
  immunizationsPdca: "/immunizations/pdca",
  immunizationsExports: "/immunizations/exports",
  occupationalHealthDrugAlcohol: "/occupational-health/drug-alcohol",
  healthPrograms: "/health-programs",
  healthProgramsDue: "/health-programs/due",
  healthProgramsHearing: "/health-programs/hearing",
  healthProgramsLung: "/health-programs/lung-function",
  healthProgramsVision: "/health-programs/vision",
  healthProgramsErgonomics: "/health-programs/ergonomics",
  healthProgramsFatigue: "/health-programs/fatigue",
  healthProgramsPolicies: "/health-programs/policies",
  healthProgramsReports: "/health-programs/reports",
  fitness: "/fitness",
  fitnessBoard: "/fitness/board",
  fitnessTraining: "/fitness/training",
  fitnessIntegrations: "/fitness/integrations",
  drugAlcohol: "/drug-alcohol",
  drugAlcoholDue: "/drug-alcohol/due",
  drugAlcoholTests: "/drug-alcohol/tests",
  drugAlcoholMro: "/drug-alcohol/mro",
  drugAlcoholRandom: "/drug-alcohol/random",
  drugAlcoholRtd: "/drug-alcohol/rtd",
  drugAlcoholPolicies: "/drug-alcohol/policies",
  drugAlcoholReports: "/drug-alcohol/reports",
  drugAlcoholAudit: "/drug-alcohol/audit",
  drugAlcoholRisk: "/drug-alcohol/risk",
  drugAlcoholAnomalies: "/drug-alcohol/anomalies",
  drugAlcoholWellbeing: "/drug-alcohol/wellbeing",
  occupationalHealthEmployerPortal: "/occupational-health/employer-portal",
  occupationalHealthAudit: "/occupational-health/audit",
  occupationalHealthPrivacy: "/occupational-health/privacy",
  occupationalHealthAnnualReport: "/occupational-health/annual-report",
  employerPortal: "/employer-portal",
  employerPortalFitness: "/employer-portal/fitness",
  employerPortalCompliance: "/employer-portal/random-compliance",
  employerPortalInvoices: "/employer-portal/invoices",
  employerPortalRequests: "/employer-portal/requests",
  employerPortalUsers: "/employer-portal/users",
  employerPortalAnnual: "/employer-portal/annual-summary",
  employerPortalJoin: "/employer-portal-join",
  employerPortalSignIn: "/employer-portal-sign-in",
  workforceForm: (token: string) => `/workforce-forms/${token}`,
  occupationalHealthCompliance: "/occupational-health/compliance",
  occupationalHealthSurveillance: "/occupational-health/surveillance",
  occupationalHealthRecalls: (customerUuid?: string) =>
    customerUuid
      ? `/occupational-health/recalls?customer=${encodeURIComponent(customerUuid)}`
      : "/occupational-health/recalls",
  occupationalHealthEmployment: (customerUuid?: string) =>
    customerUuid
      ? `/occupational-health/employment?customer=${encodeURIComponent(customerUuid)}`
      : "/occupational-health/employment",
  occupationalHealthEncounter: (visitUuid: string, encounterUuid: string) =>
    `/occupational-health/${visitUuid}/${encounterUuid}`,
  occupationalHealthRecord: (
    kind: "certificate" | "assessment" | "finding" | "iod" | "sick-leave",
    uuid: string,
  ) => `/occupational-health/records/${kind}/${uuid}`,
  clinicalOpdEncounter: (visitUuid: string, encounterUuid: string) =>
    `/clinical/opd/${visitUuid}/${encounterUuid}`,
  clinicalOpdEncounterTab: (
    visitUuid: string,
    encounterUuid: string,
    tab?:
      | "overview"
      | "activity"
      | "vital-signs"
      | "nursing"
      | "allergies"
      | "complaint"
      | "physical-examination"
      | "notes"
      | "orders"
      | "investigation-results"
      | "diagnoses"
      | "problems"
      | "medications"
      | "disposition"
      | "client",
  ) => {
    const base = `/clinical/opd/${visitUuid}/${encounterUuid}`;
    const segments: Record<string, string> = {
      activity: "activity",
      "vital-signs": "vital-signs",
      nursing: "nursing",
      allergies: "allergies",
      complaint: "complaint",
      "physical-examination": "physical-examination",
      notes: "notes",
      orders: "orders",
      "investigation-results": "investigation-results",
      diagnoses: "diagnoses",
      problems: "problems",
      medications: "medications",
      disposition: "disposition",
      client: "client",
    };
    if (!tab || tab === "overview") {
      return base;
    }
    return `${base}/${segments[tab]}`;
  },
  visitDetail: (uuid: string) => `/visits/${uuid}`,
  settings: "/settings",
  settingsAccount: "/settings/account",
  settingsSecurity: "/settings/security",
  settingsOrganization: "/settings/organization",
  settingsVisitManagement: "/settings/visit-management",
  settingsClientTags: "/settings/client-tags",
  settingsClinicalProviders: "/settings/clinical-providers",
  settingsClinicalRoleCapabilities: "/settings/clinical-role-capabilities",
  settingsFinanceOperations: "/settings/finance-operations",
  settingsUserManagement: "/settings/user-management",
  settingsModules: "/settings/modules",
  settingsModuleInventory: "/settings/modules/inventory",
  settingsModulePharmacy: "/settings/modules/pharmacy",
  settingsModuleLaboratory: "/settings/modules/laboratory",
  settingsModuleClinical: "/settings/modules/clinical",
  settingsModuleDental: "/settings/modules/dental",
  settingsModuleTheatre: "/settings/modules/theatre",
  settingsModuleRegistration: "/settings/modules/registration",
  settingsModuleOccupationalHealth: "/settings/modules/occupational-health",
  settingsOccupationalHealthEmployer: (
    employerUuid: string,
    section?: "departments" | "job-titles" | "risk-profiles",
  ) => {
    const params = new URLSearchParams({ employer: employerUuid });
    if (section && section !== "risk-profiles") {
      params.set("section", section);
    }
    return `/settings/modules/occupational-health?${params.toString()}`;
  },
  settingsModule: (slug: string) => `/settings/modules/${slug}`,
  ohTemplateBuilder: (kind: "employee" | "exam" | "certificate", uuid: string) =>
    `/templates/${kind}/${uuid}`,
  settingsIntegrations: "/settings/integrations",
  settingsIntegrationsEmail: "/settings/integrations/email",
  settingsIntegrationsMasemEclaims: "/settings/integrations/masm-eclaims",
  settingsIntegrationsMasemEclaimsTab: (tab: "connection" | "practitioners") =>
    tab === "connection"
      ? "/settings/integrations/masm-eclaims"
      : "/settings/integrations/masm-eclaims?tab=practitioners",
  /** @deprecated Use settingsIntegrationsMasemEclaimsTab("practitioners") */
  settingsIntegrationsEclaimsPractitioner:
    "/settings/integrations/masm-eclaims?tab=practitioners",
  reportsOverview: "/reports/overview",
  reportsAnalytics: "/reports/analytics",
  privacy: "/privacy",
  terms: "/terms",
  company: "/company",
  blog: "/blog",
  blogPost: (slug: string) => `/blog/${slug}`,
  blogFeed: "/blog/feed.xml",
  reportsExports: "/reports",
  reportsAppointmentsToday: "/reports/appointments/today",
  reportsExportHistory: "/reports/history",
  reportsExportWithType: (type: string) =>
    `/reports?type=${encodeURIComponent(type)}`,
} as const;

/** Paths served by web-new through the deploy gateway. */
export const WEB_NEW_ROUTE_PREFIXES = [
  ROUTES.home,
  ROUTES.auth,
  ROUTES.signup,
  ROUTES.onboarding,
  ROUTES.platformAdmin,
  ROUTES.overview,
  ROUTES.customers,
  ROUTES.labOrders,
  "/lab",
  ROUTES.salesOrders,
  ROUTES.invoices,
  ROUTES.receivables,
  ROUTES.claims,
  ROUTES.notifications,
  ROUTES.payments,
  ROUTES.therapyPhysio,
  ROUTES.therapySpeech,
  ROUTES.therapyOccupational,
  ROUTES.inventoryStock,
  ROUTES.inventoryProducts,
  ROUTES.inventoryPricelists,
  ROUTES.inventoryPurchaseOrders,
  ROUTES.inventoryInternalOrders,
  ROUTES.inventoryStockAdjustments,
  ROUTES.inventoryMovements,
  ROUTES.inventoryBatches,
  ROUTES.pharmacyQueue,
  ROUTES.pharmacyHistory,
  ROUTES.activeVisits,
  ROUTES.referrals,
  ROUTES.appointments,
  ROUTES.clinicalOpd,
  ROUTES.occupationalHealth,
  "/employer-portal",
  "/clinical",
  "/reports",
  "/visits",
  ROUTES.settings,
  ROUTES.contacts,
  ROUTES.ourProducts,
  ROUTES.pricing,
  ROUTES.about,
  ROUTES.features,
  ROUTES.services,
  ROUTES.solutions,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.company,
] as const;

export const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.auth,
  ROUTES.signup,
  ROUTES.contacts,
  ROUTES.ourProducts,
  ROUTES.pricing,
  ROUTES.about,
  ROUTES.features,
  ROUTES.services,
  ROUTES.solutions,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.company,
  ROUTES.blog,
] as const;

export const AUTH_ROUTES = [ROUTES.auth, ROUTES.signup] as const;

/** Paths that belong on the app host (app.example.com). */
export const APP_ROUTE_PREFIXES = [
  ROUTES.auth,
  "/signup",
  ROUTES.onboarding,
  ROUTES.platformAdmin,
  ROUTES.overview,
  ROUTES.customers,
  ROUTES.labOrders,
  "/lab",
  ROUTES.salesOrders,
  ROUTES.invoices,
  ROUTES.receivables,
  ROUTES.claims,
  ROUTES.notifications,
  ROUTES.payments,
  "/therapy",
  "/inventory",
  "/pharmacy",
  ROUTES.activeVisits,
  ROUTES.referrals,
  ROUTES.appointments,
  ROUTES.clinicalOpd,
  ROUTES.occupationalHealth,
  "/employer-portal",
  ROUTES.employerPortalJoin,
  ROUTES.employerPortalSignIn,
  "/workforce-forms",
  "/theatre-board",
  "/clinical",
  "/reports",
  "/visits",
  ROUTES.settings,
  "/templates",
  "/api",
] as const;

/** Paths that belong on the marketing host. `/` is exact-only via matchesRoute. */
export const MARKETING_ROUTE_PREFIXES = [
  ROUTES.home,
  ROUTES.contacts,
  ROUTES.ourProducts,
  ROUTES.pricing,
  ROUTES.about,
  ROUTES.features,
  ROUTES.services,
  ROUTES.solutions,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.company,
  ROUTES.blog,
  "/unsubscribe",
  "/design-review",
] as const;

export const PROTECTED_ROUTES = [
  ROUTES.onboarding,
  ROUTES.platformAdmin,
  ROUTES.overview,
  ROUTES.customers,
  ROUTES.labOrders,
  "/lab",
  ROUTES.salesOrders,
  ROUTES.invoices,
  ROUTES.receivables,
  ROUTES.claims,
  ROUTES.notifications,
  ROUTES.payments,
  ROUTES.therapyPhysio,
  ROUTES.therapySpeech,
  ROUTES.therapyOccupational,
  ROUTES.inventoryStock,
  ROUTES.inventoryProducts,
  ROUTES.inventoryPricelists,
  ROUTES.inventoryPurchaseOrders,
  ROUTES.inventoryInternalOrders,
  ROUTES.inventoryStockAdjustments,
  ROUTES.inventoryMovements,
  ROUTES.inventoryBatches,
  ROUTES.pharmacyQueue,
  ROUTES.pharmacyHistory,
  ROUTES.activeVisits,
  ROUTES.referrals,
  ROUTES.appointments,
  ROUTES.clinicalOpd,
  ROUTES.occupationalHealth,
  "/employer-portal",
  "/clinical",
  "/reports",
  "/visits",
  ROUTES.settings,
  "/templates",
] as const;
