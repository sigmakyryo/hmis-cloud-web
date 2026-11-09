"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import { useToast } from "@/providers/toast-provider";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import { Field } from "../shared/Field";
import { Drawer } from "../shared/Drawer";
import {
  type OhVaccine,
  type OhVaccineLot,
  createOhImmLot,
  createOhImmVaccine,
} from "@/features/occupational-health/services/immunisation.service";

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
  const [showVaccine, setShowVaccine] = useState(false);
  const [showLot, setShowLot] = useState(false);

  const createVaccine = useMutation({
    mutationFn: createOhImmVaccine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-vaccines"] });
      setShowVaccine(false);
      toast({ variant: "success", title: "Vaccine added" });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not add vaccine",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });
  const createLot = useMutation({
    mutationFn: createOhImmLot,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-lots"] });
      setShowLot(false);
      toast({ variant: "success", title: "Lot added" });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not add lot",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  if (loading) return <QuietLoading />;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-dash-muted">Vaccines</h2>
          <SecondaryButton type="button" onClick={() => setShowVaccine(true)}>
            <Plus className="size-3.5" aria-hidden />
            Add vaccine
          </SecondaryButton>
        </div>
        {vaccines.length === 0 ? (
          <EmptyAction
            title="No vaccines yet"
            description="Add a vaccine or load the example packs to get started."
          />
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {vaccines.map((vaccine) => (
              <li key={vaccine.uuid} className="px-4 py-3">
                <p className="text-[13px] font-medium text-brand-navy">
                  {vaccine.name}{" "}
                  <span className="font-normal text-dash-muted">({vaccine.code})</span>
                </p>
                <p className="text-[13px] text-dash-muted">
                  {[vaccine.brand, vaccine.manufacturer, vaccine.route, vaccine.site]
                    .filter(Boolean)
                    .join(" · ") || "No brand details"}
                  {vaccine.cvx_code ? ` · CVX ${vaccine.cvx_code}` : ""}
                  {vaccine.billing_product_uuid ? " · Linked to billing" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-dash-muted">Lots</h2>
          <SecondaryButton
            type="button"
           
            disabled={vaccines.length === 0}
            onClick={() => setShowLot(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Add lot
          </SecondaryButton>
        </div>
        {lots.length === 0 ? (
          <p className="text-[13px] text-dash-muted">No lots recorded.</p>
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {lots.map((lot) => (
              <li key={lot.uuid} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-brand-navy">
                    {lot.lot_number}
                    <span className="font-normal text-dash-muted">
                      {" "}
                      · {lot.vaccine_code}
                    </span>
                  </p>
                  <p className="text-[13px] text-dash-muted">
                    Expires {lot.expiry_date ?? "—"} · qty {lot.quantity_on_hand}
                  </p>
                </div>
                {lot.warning ? (
                  <span className="text-[12px] font-medium text-amber-800">
                    {lot.warning === "recalled"
                      ? "Recalled"
                      : lot.warning === "expired"
                        ? "Expired"
                        : "Low stock"}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showVaccine ? (
        <VaccineForm
          pending={createVaccine.isPending}
          onClose={() => setShowVaccine(false)}
          onSubmit={(payload) => createVaccine.mutate(payload)}
        />
      ) : null}
      {showLot ? (
        <LotForm
          vaccines={vaccines}
          pending={createLot.isPending}
          onClose={() => setShowLot(false)}
          onSubmit={(payload) => createLot.mutate(payload)}
        />
      ) : null}
    </div>
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
    <Drawer title="Add vaccine" onClose={onClose}>
      <Field label="Code" value={code} onChange={setCode} required />
      <Field label="Name" value={name} onChange={setName} required />
      <Field label="CVX (optional)" value={cvx} onChange={setCvx} />
      <div className="flex justify-end gap-2 pt-2">
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
      </div>
    </Drawer>
  );
}

function LotForm({
  vaccines,
  pending,
  onClose,
  onSubmit,
}: {
  vaccines: OhVaccine[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [vaccineUuid, setVaccineUuid] = useState(vaccines[0]?.uuid ?? "");
  const [lotNumber, setLotNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("10");
  return (
    <Drawer title="Add lot" onClose={onClose}>
      <div className="space-y-1.5">
        <Label>Vaccine</Label>
        <select
          className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
          value={vaccineUuid}
          onChange={(e) => setVaccineUuid(e.target.value)}
        >
          {vaccines.map((v) => (
            <option key={v.uuid} value={v.uuid}>
              {v.name} ({v.code})
            </option>
          ))}
        </select>
      </div>
      <Field label="Lot number" value={lotNumber} onChange={setLotNumber} required />
      <Field label="Expiry" value={expiry} onChange={setExpiry} type="date" />
      <Field label="Quantity" value={qty} onChange={setQty} />
      <div className="flex justify-end gap-2 pt-2">
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
      </div>
    </Drawer>
  );
}


