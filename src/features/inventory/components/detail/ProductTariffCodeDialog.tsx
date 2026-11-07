"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchInsuranceSchemes } from "@/features/customers/services/insurance-schemes.service";
import type { InsuranceScheme } from "@/features/customers/types/customer-insurance.types";
import {
  createProductTariffCode,
  updateProductTariffCode,
} from "@/features/inventory/services/inventory.service";
import type { ProductTariffCode } from "@/features/inventory/types/inventory.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type ProductTariffCodeDialogProps = {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCodes: ProductTariffCode[];
  editingCode?: ProductTariffCode | null;
  /** When creating, pre-select this scheme if it is still available. */
  preferredSchemeUuid?: string | null;
  /**
   * When true, the insurance scheme is fixed (typically the scheme linked to
   * the current pricelist) and cannot be changed.
   */
  lockScheme?: boolean;
  onSaved: () => void;
};

function formatSchemeLabel(scheme: InsuranceScheme): string {
  const company = scheme.insurance_company_name?.trim();
  const name = scheme.name?.trim();
  if (company && name) {
    return `${company} · ${name}`;
  }
  return name || company || "Insurance scheme";
}

export function ProductTariffCodeDialog({
  productId,
  open,
  onOpenChange,
  existingCodes,
  editingCode = null,
  preferredSchemeUuid = null,
  lockScheme = false,
  onSaved,
}: ProductTariffCodeDialogProps) {
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<InsuranceScheme[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);
  const [schemeUuid, setSchemeUuid] = useState("");
  const [tariffCode, setTariffCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(editingCode);
  const schemeIsLocked = lockScheme || isEditing;
  const usedSchemeUuids = useMemo(
    () => new Set(existingCodes.map((entry) => entry.scheme_uuid)),
    [existingCodes],
  );
  const availableSchemes = useMemo(
    () =>
      schemes.filter((scheme) => {
        if (!scheme.is_active) {
          return false;
        }
        if (isEditing) {
          return scheme.uuid === editingCode?.scheme_uuid;
        }
        if (lockScheme && preferredSchemeUuid) {
          return scheme.uuid === preferredSchemeUuid;
        }
        return !usedSchemeUuids.has(scheme.uuid);
      }),
    [
      editingCode?.scheme_uuid,
      isEditing,
      lockScheme,
      preferredSchemeUuid,
      schemes,
      usedSchemeUuids,
    ],
  );
  const lockedSchemeLabel = useMemo(() => {
    const lockedUuid = editingCode?.scheme_uuid ?? preferredSchemeUuid ?? schemeUuid;
    if (!lockedUuid) {
      return "—";
    }
    const matched = schemes.find((scheme) => scheme.uuid === lockedUuid);
    if (matched) {
      return formatSchemeLabel(matched);
    }
    if (editingCode?.scheme_name?.trim()) {
      return editingCode.scheme_name.trim();
    }
    return "—";
  }, [editingCode, preferredSchemeUuid, schemeUuid, schemes]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSchemeUuid(editingCode?.scheme_uuid ?? preferredSchemeUuid ?? "");
    setTariffCode(editingCode?.tariff_code ?? "");

    let cancelled = false;

    void (async () => {
      setIsLoadingSchemes(true);
      try {
        const data = await fetchInsuranceSchemes();
        if (!cancelled) {
          setSchemes(data);
          if (!editingCode && preferredSchemeUuid) {
            const preferredStillAvailable = data.some(
              (scheme) =>
                scheme.uuid === preferredSchemeUuid &&
                scheme.is_active &&
                (lockScheme ||
                  !existingCodes.some(
                    (code) => code.scheme_uuid === preferredSchemeUuid,
                  )),
            );
            if (preferredStillAvailable) {
              setSchemeUuid(preferredSchemeUuid);
            }
          }
        }
      } catch {
        if (!cancelled) {
          toast({
            variant: "error",
            title: "Could not load insurance schemes",
            description: "Try again or contact your administrator.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSchemes(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editingCode, existingCodes, lockScheme, open, preferredSchemeUuid, toast]);

  async function handleSubmit() {
    if (!schemeUuid.trim() || !tariffCode.trim()) {
      toast({
        variant: "error",
        title: "Missing information",
        description: lockScheme
          ? "Enter a tariff code."
          : "Select an insurance scheme and enter a tariff code.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingCode) {
        await updateProductTariffCode(productId, editingCode.scheme_uuid, {
          tariff_code: tariffCode.trim(),
        });
        toast({
          variant: "success",
          title: "Tariff code updated",
          description: "The insurance tariff code was saved.",
        });
      } else {
        await createProductTariffCode(productId, {
          scheme_uuid: schemeUuid,
          tariff_code: tariffCode.trim(),
        });
        toast({
          variant: "success",
          title: "Tariff code added",
          description: "The insurance tariff code was linked to this product.",
        });
      }

      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "error",
        title: isEditing ? "Could not update tariff code" : "Could not add tariff code",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : error instanceof Error
              ? error.message
              : "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", appFont.className)}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit tariff code" : "Add tariff code"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the tariff code used for this insurance scheme."
              : lockScheme
                ? "Add a tariff code for this pricelist’s insurance scheme."
                : "Link this product to an insurance scheme with a tariff code."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tariff-scheme">Insurance scheme</Label>
            {isLoadingSchemes ? (
              <div className="flex items-center gap-2 text-sm text-brand-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading schemes...
              </div>
            ) : schemeIsLocked ? (
              <Input
                id="tariff-scheme"
                value={lockedSchemeLabel}
                disabled
                readOnly
              />
            ) : (
              <Select
                value={schemeUuid}
                onValueChange={setSchemeUuid}
                disabled={isSubmitting}
              >
                <SelectTrigger id="tariff-scheme">
                  <SelectValue placeholder="Select a scheme" />
                </SelectTrigger>
                <SelectContent>
                  {availableSchemes.map((scheme) => (
                    <SelectItem key={scheme.uuid} value={scheme.uuid}>
                      {formatSchemeLabel(scheme)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tariff-code">Tariff code</Label>
            <Input
              id="tariff-code"
              value={tariffCode}
              disabled={isSubmitting}
              placeholder="e.g. 03001"
              onChange={(event) => setTariffCode(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <SecondaryButton
            type="button"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={isSubmitting || isLoadingSchemes || !schemeUuid.trim()}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Add tariff code"
            )}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
