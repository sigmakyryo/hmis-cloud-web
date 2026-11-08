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
import {
  cameraAccessErrorMessage,
  captureVideoFrame,
  requestCameraStream,
  stopMediaStream,
} from "@/features/customers/utils/customer-photo-camera";
import { appFont } from "@/lib/fonts";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCameraLive, setIsCameraLive] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fullName = formatCustomerName(customer);
  const seed = customer.uuid || customer.customer_identifier || fullName;
  const busy = isSaving || isClearing || isRequestingCamera;

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!isCameraLive || !video || !stream) {
      return;
    }
    video.srcObject = stream;
    try {
      if (typeof video.play === "function") {
        void Promise.resolve(video.play()).catch(() => undefined);
      }
    } catch {
      // Some environments throw from play() instead of rejecting a promise.
    }
    return () => {
      video.srcObject = null;
    };
  }, [isCameraLive]);

  useEffect(() => {
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setPreviewUrl(url);
      }
    });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function releaseCamera() {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setIsCameraLive(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      releaseCamera();
      setFile(null);
      setPreviewUrl(null);
      setCameraError(null);
    }
    onOpenChange(next);
  }

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
    releaseCamera();
    setCameraError(null);
    setFile(next);
  }

  async function handleOpenCamera() {
    setCameraError(null);
    setIsRequestingCamera(true);
    try {
      const stream = await requestCameraStream();
      stopMediaStream(streamRef.current);
      streamRef.current = stream;
      setIsCameraLive(true);
    } catch (error) {
      releaseCamera();
      setCameraError(cameraAccessErrorMessage(error));
    } finally {
      setIsRequestingCamera(false);
    }
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    try {
      const photo = await captureVideoFrame(video);
      acceptFile(photo);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Could not capture a photo.",
      );
    }
  }

  async function handleSave() {
    if (!file) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await uploadCustomerPhoto(customer.uuid, file);
      onUpdated(updated);
      handleOpenChange(false);
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
      handleOpenChange(false);
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

  const displayUrl = (file ? previewUrl : null) || customer.photo_url || null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(appFont.className, "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle>Client photo</DialogTitle>
          <DialogDescription>
            Upload a photo or capture one with your device camera.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {isCameraLive ? (
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              aria-label="Camera preview"
              data-testid="customer-photo-camera-preview"
              className="aspect-[4/3] w-full -scale-x-100 rounded-xl bg-black object-cover"
            />
          ) : (
            <ClientProfileAvatar
              name={fullName}
              seed={seed}
              photoUrl={displayUrl}
              className="size-24 rounded-xl"
              fallbackClassName="rounded-xl text-lg"
            />
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {isCameraLive ? (
              <>
                <PrimaryButton
                  type="button"
                  onClick={() => void handleCapture()}
                  disabled={busy}
                  data-testid="customer-photo-camera-capture"
                >
                  <Camera className="size-3.5" aria-hidden />
                  Take photo
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={releaseCamera}
                  disabled={busy}
                >
                  Close camera
                </SecondaryButton>
              </>
            ) : (
              <>
                <SecondaryButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <Upload className="size-3.5" aria-hidden />
                  Upload
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => void handleOpenCamera()}
                  disabled={busy}
                  data-testid="customer-photo-camera-start"
                >
                  {isRequestingCamera ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Camera className="size-3.5" aria-hidden />
                  )}
                  {isRequestingCamera ? "Asking for camera…" : "Camera"}
                </SecondaryButton>
              </>
            )}
          </div>
          {cameraError ? (
            <p
              className="text-center text-sm text-destructive"
              role="alert"
              data-testid="customer-photo-camera-error"
            >
              {cameraError}
            </p>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              acceptFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {customer.photo_url ? (
            <SecondaryButton
              type="button"
              onClick={() => void handleClear()}
              disabled={busy}
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
              onClick={() => handleOpenChange(false)}
              disabled={isSaving || isClearing}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="button"
              onClick={() => void handleSave()}
              disabled={!file || busy}
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
