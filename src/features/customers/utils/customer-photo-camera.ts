/** Open the device camera for a client profile photo. */

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: "user" } },
};

export function cameraAccessErrorMessage(error: unknown): string {
  const name = errorName(error);
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera access is blocked. Allow the camera for this site in your browser, then try again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device. Upload a photo instead.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The camera is already in use. Close the other app using it, then try again.";
  }
  if (name === "SecurityError" || name === "CameraUnavailableError") {
    return "This browser cannot use the camera here. Upload a photo instead.";
  }
  return "Could not open the camera. Try again, or upload a photo.";
}

/** Ask the browser for camera access and return the live stream. */
export async function requestCameraStream(): Promise<MediaStream> {
  const devices = navigator.mediaDevices;
  if (!devices?.getUserMedia) {
    const unavailable = new Error("This browser cannot use the camera.");
    unavailable.name = "CameraUnavailableError";
    throw unavailable;
  }
  try {
    return await devices.getUserMedia(CAMERA_CONSTRAINTS);
  } catch (error) {
    if (errorName(error) !== "OverconstrainedError") {
      throw error;
    }
    return devices.getUserMedia({ audio: false, video: true });
  }
}

/** Freeze the current video frame as a JPEG file. */
export function captureVideoFrame(video: HTMLVideoElement): Promise<File> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return Promise.reject(new Error("The camera is not ready yet."));
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Could not capture a photo."));
  }
  // Front cameras present a mirrored frame. Flip it so the saved photo matches the person.
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not capture a photo."));
          return;
        }
        resolve(
          new File([blob], `client-photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function errorName(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }
  return "";
}
