"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { useToast } from "@/providers/toast-provider";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { EmptyAction } from "../shared/EmptyAction";
import { Field, SelectField } from "../shared/Field";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmCodeChips, ImmDateCell, ImmMeter, daysFromToday } from "../shared/ImmVisuals";
import { QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";
import {
  type OhVaccine,
  type OhVaccineLot,
  createOhImmLot,
  createOhImmVaccine,
} from "@/features/occupational-health/services/immunisation.service";

type VaccineView = "vaccines" | "lots";
type LotState = "in_stock" | "expiring" | "low_stock" | "expired" | "recalled";

const EXPIRY_WARNING_DAYS = 60;

const LOT_LABEL: Record<LotState, string> = {
  in_stock: "In stock",
  expiring: "Expiring",
  low_stock: "Low stock",
  expired: "Expired",
  recalled: "Recalled",
};

function lotState(lot: OhVaccineLot): LotState {
  if (lot.recalled || lot.warning === "recalled") return "recalled";
  if (lot.expired || lot.warning === "expired") return "expired";
  const days = daysFromToday(lot.expiry_date);
  if (days != null && days <= EXPIRY_WARNING_DAYS) return "expiring";
  if (lot.warning === "low_stock") return "low_stock";
  return "in_stock";
}

function usable(lot: OhVaccineLot): boolean {
  const state = lotState(lot);
  return state !== "expired" && state !== "recalled";
}

export function VaccinesLots({
  vaccines,
  lots,
  loading,
}: {
  vaccines: OhVaccine[];
  lots: OhVaccineLot[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<VaccineView>("vaccines");
  const [lotFilter, setLotFilter] = useState<"" | LotState>("");
  const [lotVaccine, setLotVaccine] = useState("");
  const [showVaccine, setShowVaccine] = useState(false);
  const [lotFor, setLotFor] = useState<string | null>(null);
  const [detailUuid, setDetailUuid] = useState<string | null>(null);

  const lotsByVaccine = new Map<string, OhVaccineLot[]>();
  for (const lot of lots) {
    if (lot.vaccine_code) lotsByVaccine.set(lot.vaccine_code, [...(lotsByVaccine.get(lot.vaccine_code) ?? []), lot]);
  }
  const stockFor = (code: string) =>
    (lotsByVaccine.get(code) ?? []).filter(usable).reduce((sum, lot) => sum + lot.quantity_on_hand, 0);
  const nextExpiry = (code: string) =>
    (lotsByVaccine.get(code) ?? [])
      .filter(usable)
      .map((lot) => lot.expiry_date)
      .filter((date): date is string => Boolean(date))
      .sort()[0] ?? null;
  const maxStock = Math.max(1, ...vaccines.map((v) => stockFor(v.code)));
  const maxLot = Math.max(1, ...lots.map((lot) => lot.quantity_on_hand));

  const vaccineList = useImmList({
    rows: vaccines,
    searchText: (v) => [v.name, v.code, v.brand, v.manufacturer, v.cvx_code].join(" "),
    sortValue: (v, key) =>
      key === "stock" ? stockFor(v.code) : key === "lots" ? (lotsByVaccine.get(v.code) ?? []).length : key === "expiry" ? nextExpiry(v.code) : v.name,
    defaultSort: { key: "name", direction: "asc" },
  });
  const lotList = useImmList({
    rows: lots.filter((lot) => (!lotFilter || lotState(lot) === lotFilter) && (!lotVaccine || lot.vaccine_code === lotVaccine)),
    searchText: (lot) => [lot.lot_number, lot.vaccine_code].join(" "),
    sortValue: (lot, key) =>
      key === "lot" ? lot.lot_number : key === "vaccine" ? lot.vaccine_code : key === "qty" ? lot.quantity_on_hand : lot.expiry_date,
    defaultSort: { key: "expiry", direction: "asc" },
  });

  const createVaccine = useMutation({
    mutationFn: createOhImmVaccine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-vaccines"] });
      setShowVaccine(false);
      toast({ variant: "success", title: "Vaccine added" });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not add vaccine", description: error instanceof Error ? error.message : "Try again." }),
  });
  const createLot = useMutation({
    mutationFn: createOhImmLot,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-lots"] });
      setLotFor(null);
      toast({ variant: "success", title: "Lot added" });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not add lot", description: error instanceof Error ? error.message : "Try again." }),
  });

  if (loading) return <QuietLoading />;

  const counts: Record<LotState, number> = { in_stock: 0, expiring: 0, low_stock: 0, expired: 0, recalled: 0 };
  for (const lot of lots) counts[lotState(lot)] += 1;
  const totalStock = lots.filter(usable).reduce((sum, lot) => sum + lot.quantity_on_hand, 0);
  const showLots = (state: LotState) => {
    setView("lots");
    setLotFilter((current) => (current === state ? "" : state));
  };
  const detail = vaccines.find((v) => v.uuid === detailUuid) ?? null;

  return (
    <>
      <ImmTabsBar
        label="Vaccine records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "vaccines", label: "Vaccines", count: vaccines.length },
          { key: "lots", label: "Lots", count: lots.length },
        ]}
        actions={
          view === "vaccines" ? (
            <PageActionButton type="button" onClick={() => setShowVaccine(true)}>
              <AppIcon name="add" className="size-3.5" />
              Add vaccine
            </PageActionButton>
          ) : (
            <PageActionButton type="button" disabled={vaccines.length === 0} onClick={() => setLotFor(vaccines[0]?.uuid ?? "")}>
              <AppIcon name="add" className="size-3.5" />
              Add lot
            </PageActionButton>
          )
        }
      />
      {vaccines.length > 0 ? (
        <ImmInsightStrip
          testId="oh-imm-vaccine-insights"
          items={[
            { label: "vaccines", value: vaccines.length },
            { label: "doses on hand", value: totalStock, hint: `${lots.length} lots` },
            {
              label: "expiring",
              value: counts.expiring,
              tone: counts.expiring > 0 ? "warning" : "default",
              hint: `within ${EXPIRY_WARNING_DAYS} days`,
              onSelect: () => showLots("expiring"),
              active: view === "lots" && lotFilter === "expiring",
            },
            {
              label: "low stock",
              value: counts.low_stock,
              tone: counts.low_stock > 0 ? "warning" : "default",
              onSelect: () => showLots("low_stock"),
              active: view === "lots" && lotFilter === "low_stock",
            },
            {
              label: "expired or recalled",
              value: counts.expired + counts.recalled,
              tone: counts.expired + counts.recalled > 0 ? "danger" : "default",
              onSelect: () => showLots("expired"),
              active: view === "lots" && lotFilter === "expired",
            },
          ]}
        />
      ) : null}

      {view === "vaccines" ? (
        vaccines.length === 0 ? (
          <EmptyAction
            icon="pill"
            title="No vaccines yet"
            description="Add a vaccine or load the example packs from Due & overdue to get started."
          />
        ) : (
          <>
            <ImmSearchBar
              value={vaccineList.query}
              onChange={vaccineList.setQuery}
              placeholder="Search name, code, brand, or CVX"
              matched={vaccineList.controls.matched}
              total={vaccines.length}
              onClear={() => vaccineList.setQuery("")}
            />
            {vaccineList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching vaccines" description="Try a different search." />
            ) : (
              <ImmRecordTable
                list={vaccineList.controls}
                columns={[
                  { label: "Vaccine", sortKey: "name" },
                  "Brand",
                  "Route",
                  "CVX",
                  { label: "Usable stock", sortKey: "stock" },
                  { label: "Lots", sortKey: "lots", align: "right" },
                  { label: "Next expiry", sortKey: "expiry" },
                  "Billing",
                  "Actions",
                ]}
              >
                {vaccineList.pageRows.map((vaccine) => {
                  const stock = stockFor(vaccine.code);
                  return (
                    <ListPageDataTableRow key={vaccine.uuid} className="cursor-pointer" onClick={() => setDetailUuid(vaccine.uuid)}>
                      <ListPageDataTableCell className="pl-4 md:pl-6">
                        <ImmPrimaryCell title={vaccine.name} detail={<span className="font-mono">{vaccine.code}</span>} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmPrimaryCell title={vaccine.brand || "—"} detail={vaccine.manufacturer || undefined} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>{[vaccine.route, vaccine.site].filter(Boolean).join(" · ") || "—"}</ListPageDataTableCell>
                      <ListPageDataTableCell className="font-mono text-[12px]">{vaccine.cvx_code || "—"}</ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmMeter value={stock} max={maxStock} label={`${stock} doses`} tone={stock === 0 ? "danger" : "primary"} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="text-right tabular-nums">{(lotsByVaccine.get(vaccine.code) ?? []).length}</ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmDateCell date={nextExpiry(vaccine.code)} warnWithinDays={EXPIRY_WARNING_DAYS} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        {vaccine.billing_product_uuid ? <ImmStatusBadge status="done" label="Linked" /> : <span className="text-dash-muted">Not linked</span>}
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                        <ImmRowAction onClick={() => setLotFor(vaccine.uuid)}>Add lot</ImmRowAction>
                      </ListPageDataTableCell>
                    </ListPageDataTableRow>
                  );
                })}
              </ImmRecordTable>
            )}
          </>
        )
      ) : lots.length === 0 ? (
        <EmptyAction icon="package" title="No lots recorded" description="Add a lot to record batch, expiry, and stock on hand." />
      ) : (
        <>
          <ImmSearchBar
            value={lotList.query}
            onChange={lotList.setQuery}
            placeholder="Search lot number"
            matched={lotList.controls.matched}
            total={lots.length}
            onClear={
              lotFilter || lotVaccine || lotList.query
                ? () => {
                    setLotFilter("");
                    setLotVaccine("");
                    lotList.setQuery("");
                  }
                : undefined
            }
            filters={
              <>
                <ImmFilterSelect label="Vaccine" value={lotVaccine} onChange={setLotVaccine}>
                  <option value="">All vaccines</option>
                  {vaccines.map((v) => (
                    <option key={v.uuid} value={v.code}>
                      {v.name}
                    </option>
                  ))}
                </ImmFilterSelect>
                <ImmFilterSelect label="Lot status" value={lotFilter} onChange={(value) => setLotFilter(value as "" | LotState)}>
                  <option value="">Any status</option>
                  {(Object.keys(LOT_LABEL) as LotState[]).map((state) => (
                    <option key={state} value={state}>
                      {LOT_LABEL[state]} ({counts[state]})
                    </option>
                  ))}
                </ImmFilterSelect>
              </>
            }
          />
          {lotList.pageRows.length === 0 ? (
            <EmptyAction icon="search" title="No matching lots" description="Change the filters to see more lots." />
          ) : (
            <ImmRecordTable
              list={lotList.controls}
              columns={[
                { label: "Lot", sortKey: "lot" },
                { label: "Vaccine", sortKey: "vaccine" },
                { label: "Expires", sortKey: "expiry" },
                { label: "On hand", sortKey: "qty" },
                "Status",
              ]}
            >
              {lotList.pageRows.map((lot) => {
                const state = lotState(lot);
                return (
                  <ListPageDataTableRow key={lot.uuid} className={state === "recalled" || state === "expired" ? "opacity-70" : undefined}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmPrimaryCell title={<span className="font-mono">{lot.lot_number}</span>} detail={lot.recall_reason || undefined} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmCodeChips codes={lot.vaccine_code ? [lot.vaccine_code] : []} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmDateCell date={lot.expiry_date} warnWithinDays={EXPIRY_WARNING_DAYS} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmMeter
                        value={lot.quantity_on_hand}
                        max={maxLot}
                        label={String(lot.quantity_on_hand)}
                        tone={state === "low_stock" ? "warning" : lot.quantity_on_hand === 0 ? "danger" : "primary"}
                      />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={state} label={LOT_LABEL[state]} />
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                );
              })}
            </ImmRecordTable>
          )}
        </>
      )}

      {detail ? (
        <Drawer wide title={detail.name} description={[detail.code, detail.brand, detail.manufacturer].filter(Boolean).join(" · ")} onClose={() => setDetailUuid(null)}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {[
              ["Route", [detail.route, detail.site].filter(Boolean).join(" · ") || "—"],
              ["Dose volume", detail.dose_volume_ml != null ? `${detail.dose_volume_ml} mL` : "—"],
              ["CVX", detail.cvx_code || "—"],
              ["ATC", detail.atc_code || "—"],
              ["Billing product", detail.billing_product_uuid ? "Linked" : "Not linked"],
              ["Contraindications", detail.contraindications.length ? detail.contraindications.join(", ") : "None recorded"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-dash-border/70 pb-2">
                <dt className="text-[12px] text-dash-muted">{label}</dt>
                <dd className="text-brand-navy">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-brand-navy">Lots ({(lotsByVaccine.get(detail.code) ?? []).length})</p>
              <ImmRowAction
                onClick={() => {
                  setDetailUuid(null);
                  setLotFor(detail.uuid);
                }}
              >
                Add lot
              </ImmRowAction>
            </div>
            {(lotsByVaccine.get(detail.code) ?? []).length === 0 ? (
              <p className="text-[13px] text-dash-muted">No lots recorded for this vaccine.</p>
            ) : (
              <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
                {(lotsByVaccine.get(detail.code) ?? [])
                  .toSorted((a, b) => String(a.expiry_date ?? "9").localeCompare(String(b.expiry_date ?? "9")))
                  .map((lot) => {
                    const state = lotState(lot);
                    return (
                      <li key={lot.uuid} className="flex items-center gap-3 py-2 text-[13px]">
                        <span className="w-28 truncate font-mono text-brand-navy">{lot.lot_number}</span>
                        <span className="flex-1">
                          <ImmDateCell date={lot.expiry_date} warnWithinDays={EXPIRY_WARNING_DAYS} />
                        </span>
                        <span className="w-20 text-right tabular-nums">{lot.quantity_on_hand}</span>
                        <ImmStatusBadge status={state} label={LOT_LABEL[state]} />
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </Drawer>
      ) : null}

      {showVaccine ? (
        <VaccineForm
          pending={createVaccine.isPending}
          onClose={() => setShowVaccine(false)}
          onSubmit={(payload) => createVaccine.mutate(payload)}
        />
      ) : null}
      {lotFor != null ? (
        <LotForm
          vaccines={vaccines}
          defaultVaccineUuid={lotFor}
          pending={createLot.isPending}
          onClose={() => setLotFor(null)}
          onSubmit={(payload) => createLot.mutate(payload)}
        />
      ) : null}
    </>
  );
}

function VaccineForm({
  pending,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [cvx, setCvx] = useState("");
  return (
    <Drawer title="Add vaccine" description="Adds a vaccine to the catalog used when recording doses." onClose={onClose}>
      <Field label="Code" value={code} onChange={setCode} required />
      <Field label="Name" value={name} onChange={setName} required />
      <Field label="CVX code" value={cvx} onChange={setCvx} />
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={pending || !code.trim() || !name.trim()}
          onClick={() =>
            onSubmit({
              code: code.trim(),
              name: name.trim(),
              cvx_code: cvx.trim() || undefined,
            })
          }
        >
          Save
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}

function LotForm({
  vaccines,
  defaultVaccineUuid,
  pending,
  onClose,
  onSubmit,
}: {
  vaccines: OhVaccine[];
  defaultVaccineUuid: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [vaccineUuid, setVaccineUuid] = useState(defaultVaccineUuid || (vaccines[0]?.uuid ?? ""));
  const [lotNumber, setLotNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("10");
  return (
    <Drawer title="Add lot" description="Batch number, expiry, and stock on hand." onClose={onClose}>
      <SelectField label="Vaccine" required value={vaccineUuid} onChange={setVaccineUuid}>
        {vaccines.map((v) => (
          <option key={v.uuid} value={v.uuid}>
            {v.name} ({v.code})
          </option>
        ))}
      </SelectField>
      <Field label="Lot number" value={lotNumber} onChange={setLotNumber} required />
      <Field label="Expiry" value={expiry} onChange={setExpiry} type="date" />
      <Field label="Quantity" value={qty} onChange={setQty} type="number" />
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={pending || !vaccineUuid || !lotNumber.trim()}
          onClick={() =>
            onSubmit({
              vaccine_uuid: vaccineUuid,
              lot_number: lotNumber.trim(),
              expiry_date: expiry || null,
              quantity_on_hand: Number(qty) || 0,
            })
          }
        >
          Save
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
