"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { errorText } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { BillingAccountPicker, ScopeCheckboxes } from "@/features/employer-portal/admin/components/AccessFields";
import { updatePortalContact, type PortalContact } from "@/features/employer-portal/services/employer-portal.service";
import { useToast } from "@/providers/toast-provider";

/** Change what an existing login can see, or switch its access off. New logins go through `AccessSheet`. */
export function ContactDrawer({ contact, onClose }: { contact: PortalContact; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [chosen, setChosen] = useState(contact.scopes);
  const [accounts, setAccounts] = useState(contact.billing_customers);
  const [active, setActive] = useState(contact.is_active);
  const save = useMutation({
    mutationFn: () =>
      updatePortalContact(contact.uuid, {
        scopes: chosen,
        billing_customer_uuids: accounts.map((account) => account.uuid),
        is_active: active,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["oh-portal-admin"] });
      toast({ variant: "success", title: "Saved", description: "The change applies the next time they open the portal." });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <Drawer title={contact.name || contact.email} description={`${contact.employer_name} · ${contact.email}`} onClose={onClose}>
      <div className="space-y-4 text-[13px]" data-testid="oh-portal-contact-sheet">
        <ScopeCheckboxes chosen={chosen} onChange={setChosen} />
        {chosen.includes("invoices") ? <BillingAccountPicker accounts={accounts} onChange={setAccounts} /> : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Portal access on
        </label>
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
            Save
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}
