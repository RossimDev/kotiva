import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      navigate({ to: "/app/dashboard" });
    } else {
      const timer = setTimeout(() => navigate({ to: "/auth" }), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-white">
      <div className="text-center">
        <h1 className="font-display text-3xl font-extrabold">Entrando...</h1>
        <p className="mt-2 text-sm text-slate-300">Autenticando com Google.</p>
      </div>
    </div>
  );
}
