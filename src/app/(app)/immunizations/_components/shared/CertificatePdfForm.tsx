"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  downloadOhImmCertificatePdf,
  issueOhImmCertificate,
} from "@/features/occupational-health/services/immunisation.service";
import { useToast } from "@/providers/toast-provider";

export function CertificatePdfForm() {
  const { toast } = useToast();
  const [customerUuid, setCustomerUuid] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-[12px]">Employee customer UUID</Label>
        <Input
          className="h-8 w-72"
          value={customerUuid}
          onChange={(e) => setCustomerUuid(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </div>
      <PrimaryButton
        type="button"
        data-testid="oh-imm-hub-download-pdf"
        disabled={pending || !customerUuid.trim()}
        onClick={async () => {
          setPending(true);
          try {
            const cert = await issueOhImmCertificate(customerUuid.trim());
            const { blob, filename } = await downloadOhImmCertificatePdf(cert.uuid);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast({ variant: "success", title: "PDF downloaded" });
          } catch (error) {
            toast({
              variant: "error",
              title: "Could not download PDF",
              description: error instanceof Error ? error.message : "Try again.",
            });
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Preparing…" : "Download PDF"}
      </PrimaryButton>
    </div>
  );
}
