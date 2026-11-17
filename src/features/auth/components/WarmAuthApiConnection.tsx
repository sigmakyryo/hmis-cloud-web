"use client";

import { useEffect } from "react";

import { warmAuthApiConnection } from "@/features/auth/services/auth.service";

/** Warm Django through the BFF while the user is still on the auth screen. */
export function WarmAuthApiConnection() {
  useEffect(() => {
    warmAuthApiConnection();
  }, []);

  return null;
}
