"use client";

import { Camera, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ClientProfileAvatar } from "@/components/client-profile-avatar";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearCustomerPhoto,
  uploadCustomerPhoto,
} from "@/features/customers/services/customers.service";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { useToast } from "@/providers/toast-provider";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type CustomerPhotoDialogProps = {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (customer: Customer) => void;
};

export function CustomerPhotoDialog({
  customer,
  open,
  onOpenChange,
  onUpdated,
}: CustomerPhotoDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fullName = formatCustomerName(customer);
  const seed = customer.uuid || customer.customer_identifier || fullName;

  useEffect(() => {
    if (!open) {
      setFile(null);
      setPreviewUrl(null);
    }
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function acceptFile(next: File | null) {
    if (!next) {
      return;
    }
    if (!next.type.startsWith("image/")) {
      toast({
        variant: "error",
        title: "Invalid file",
        description: "Choose an image file.",
      });
      return;
    }
    if (next.size > MAX_PHOTO_BYTES) {
      toast({
        variant: "error",
        title: "File too large",
        description: "Photos must be 5 MB or smaller.",
      });
      return;
    }
    setFile(next);
  }

  async function handleSave() {
    if (!file) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await uploadCustomerPhoto(customer.uuid, file);
      onUpdated(updated);
      onOpenChange(false);
      toast({
        variant: "success",
        title: "Photo updated",
        description: "The client profile photo was saved.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not save photo",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    setIsClearing(true);
    try {
      const updated = await clearCustomerPhoto(customer.uuid);
      onUpdated(updated);
      setFile(null);
      onOpenChange(false);
      toast({
        variant: "success",
        title: "Photo removed",
        description: "The client now uses the default avatar.",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not remove photo",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setIsClearing(false);
    }
  }

  const displayUrl = previewUrl || customer.photo_url || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Client photo</DialogTitle>
          <DialogDescription>
            Upload a photo or capture one with your device camera.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <ClientProfileAvatar
            name={fullName}
            seed={seed}
            photoUrl={displayUrl}
            className="size-24 rounded-xl"
            fallbackClassName="rounded-xl text-lg"
          />
          <div className="flex flex-wrap justify-center gap-2">
            <SecondaryButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving || isClearing}
            >
              <Upload className="size-3.5" aria-hidden />
              Upload
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isSaving || isClearing}
            >
              <Camera className="size-3.5" aria-hidden />
              Camera
            </SecondaryButton>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {customer.photo_url ? (
            <SecondaryButton
              type="button"
              onClick={() => void handleClear()}
              disabled={isSaving || isClearing}
            >
              {isClearing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Remove photo
            </SecondaryButton>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <SecondaryButton
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isClearing}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => void handleSave()}
              disabled={!file || isSaving || isClearing}
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save
            </PrimaryButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
