import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Transição suave (fade + slide) a cada mudança de rota/aba. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="animate-page-in motion-reduce:animate-none">
      {children}
    </div>
  );
}
