"use client";

import { useEffect, type ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { isPortalOnlyUser } from "@/features/employer-portal/services/employer-portal.service";
import { AppInitializationScreen } from "@/features/app-shell/components/AppInitializationScreen";
import { handleSessionExpired } from "@/lib/handle-session-expired";
import { useSessionStore } from "@/state/session.store";

type AuthGuardProps = {
  children: ReactNode;
  /** The employer portal shell; everywhere else sends employer contacts to their portal. */
  portal?: boolean;
};

export function AuthGuard({ children, portal = false }: AuthGuardProps) {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const initialize = useSessionStore((state) => state.initialize);

  useEffect(() => {
    let active = true;

    void (async () => {
      await initialize();
      if (!active || useSessionStore.getState().status !== "ready") {
        return;
      }

      // Signup stores the account before module groups exist. Reload used to
      // be the first time the shell read them. Refresh once the shell mounts.
      await useSessionStore.getState().refreshUser();
    })();

    return () => {
      active = false;
    };
  }, [initialize]);

  useEffect(() => {
    if (status !== "unauthenticated") {
      return;
    }

    void handleSessionExpired();
  }, [status]);

  const sendToPortal = !portal && status === "ready" && isPortalOnlyUser(user);
  useEffect(() => {
    if (sendToPortal) {
      window.location.replace(ROUTES.employerPortalSignIn);
    }
  }, [sendToPortal]);

  if (status === "ready" && user && !sendToPortal) {
    return children;
  }

  return <AppInitializationScreen />;
}
