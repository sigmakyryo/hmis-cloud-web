"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
import type { CatalogPricelistMembership } from "@/features/catalog/types/catalog.types";
import { updateInventoryProduct } from "@/features/inventory/services/inventory.service";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type EditPricelistProductNameDialogProps = {
  item: CatalogPricelistMembership | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

export function EditPricelistProductNameDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
}: EditPricelistProductNameDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !item) {
      return;
    }
    setName(item.product_name?.trim() || "");
  }, [item, open]);

  async function handleSave() {
    if (!item) {
      return;
    }
    const nextName = name.trim();
    if (!nextName) {
      toast({
        variant: "error",
        title: "Name required",
        description: "Enter a product name.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateInventoryProduct(item.product_uuid, { name: nextName });
      toast({
        variant: "success",
        title: "Product name updated",
      });
      onOpenChange(false);
      onUpdated();
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not update name",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : error instanceof Error
              ? error.message
              : "Something went wrong.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSaving) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className={cn("sm:max-w-md", appFont.className)}>
        <DialogHeader>
          <DialogTitle>Edit product name</DialogTitle>
          <DialogDescription>
            Update the catalog name for this product. It applies everywhere the
            product is used.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="pricelist-edit-product-name">Name</Label>
          <Input
            id="pricelist-edit-product-name"
            value={name}
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
        </div>
        <DialogFooter>
          <SecondaryButton
            type="button"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={isSaving || !name.trim()}
            onClick={() => void handleSave()}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              "Save name"
            )}
          </PrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
