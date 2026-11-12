"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { CheckField, Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { openWbCase, type WbCase } from "@/features/occupational-health/services/wellbeing.service";
import { useToast } from "@/providers/toast-provider";
import { errorText } from "../shared/da-format";

export function WbNewCaseDrawer({ onClose, onOpened }: { onClose: () => void; onOpened: (c: WbCase) => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [customer, setCustomer] = useState("");
  const [initials, setInitials] = useState("");
  const [selfReferral, setSelfReferral] = useState(true);
  const [safeHarbour, setSafeHarbour] = useState(true);
  const open = useMutation({
    mutationFn: () =>
      openWbCase({
        customer_uuid: customer.trim(),
        customer_initials: initials.trim() || undefined,
        origin: selfReferral ? "self_referral" : "referral",
        safe_harbour: selfReferral ? safeHarbour : false,
      }),
    onSuccess: (c) => {
      toast({ variant: "success", title: "Support case opened" });
      void client.invalidateQueries({ queryKey: ["oh-wb"] });
      onClose();
      onOpened(c);
    },
    onError: (error) => toast({ variant: "error", title: "Not opened", description: errorText(error) }),
  });
  return (
    <Drawer title="Open a support case" description="Private: the employer only sees that support is in place" onClose={onClose}>
      <div className="space-y-4" data-testid="oh-wb-new-case">
        <Field label="Employee ID" required value={customer} onChange={setCustomer} />
        <Field label="Initials" value={initials} onChange={setInitials} />
        <CheckField label="The person asked for help themselves" checked={selfReferral} onChange={setSelfReferral} />
        {selfReferral ? (
          <CheckField
            label="Safe harbour: no disciplinary action for this disclosure (only before any test is requested)"
            checked={safeHarbour}
            onChange={setSafeHarbour}
          />
        ) : null}
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={!customer.trim() || open.isPending} onClick={() => open.mutate()}>
            Open case
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}
