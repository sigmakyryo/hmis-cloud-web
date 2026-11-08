import { describe, expect, it, vi } from "vitest";

import {
  cameraAccessErrorMessage,
  captureVideoFrame,
} from "@/features/customers/utils/customer-photo-camera";

describe("cameraAccessErrorMessage", () => {
  it("asks the user to allow the camera when permission is denied", () => {
    const error = new DOMException("Permission denied", "NotAllowedError");

    expect(cameraAccessErrorMessage(error)).toMatch(/allow the camera/i);
  });

  it("explains when the device has no camera", () => {
    const error = new DOMException("No device", "NotFoundError");

    expect(cameraAccessErrorMessage(error)).toMatch(/no camera/i);
  });
});

describe("captureVideoFrame", () => {
  it("flips the front-camera frame so the saved photo is not mirrored", async () => {
    const translate = vi.fn();
    const scale = vi.fn();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      translate,
      scale,
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback?.(new Blob(["jpeg"], { type: "image/jpeg" }));
    });

    const video = { videoWidth: 8, videoHeight: 4 } as HTMLVideoElement;
    const photo = await captureVideoFrame(video);

    expect(translate).toHaveBeenCalledWith(8, 0);
    expect(scale).toHaveBeenCalledWith(-1, 1);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 8, 4);
    expect(photo.type).toBe("image/jpeg");
  });
});
