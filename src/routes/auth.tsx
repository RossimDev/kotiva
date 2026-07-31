import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Kotiva" },
      { name: "description", content: "Acesse sua conta Kotiva ou crie uma gratuita para começar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/app/dashboard" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6, "Mínimo 6 caracteres"),
          name: z.string().min(1).max(80),
        }).safeParse(form);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/app/dashboard`,
            data: { display_name: parsed.data.name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail se solicitado.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha inválidos" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold text-white">
          <img src="/logo-kotiva.png" alt="Kotiva" className="h-10 w-auto drop-shadow-md" />
          <span className="text-[#5B4DFF]">KOTIVA</span>
        </Link>
        <Card className="p-8 shadow-soft">
          <h1 className="font-display text-2xl font-bold">{mode === "signup" ? "Criar conta" : "Entrar"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Comece gratuitamente em segundos." : "Acesse seu painel."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div><Label htmlFor="name">Nome</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} /></div>
            )}
            <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></div>
            <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></div>
            <Button type="submit" className="w-full shadow-glow" disabled={loading}>
              {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" className="w-full border-[#5B4DFF]/40 bg-[#1E293B] text-white hover:bg-[#5B4DFF]/10 hover:text-white" onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth/callback` });
            if (result.error) { toast.error("Falha no login com Google"); return; }
            if (result.redirected) return;
            navigate({ to: "/app/dashboard" });
          }}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 39.6 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.5 5.3C41.6 35 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
            Continuar com Google
          </Button>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Já tem conta?" : "Não tem conta?"}{" "}
            <button className="font-medium text-primary hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Entrar" : "Criar agora"}
            </button>
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
