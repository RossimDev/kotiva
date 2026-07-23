import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Refrigerator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — SmartFridge AI" },
      { name: "description", content: "Acesse sua conta SmartFridge AI ou crie uma gratuita para começar." },
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
    <div className="flex min-h-screen items-center justify-center bg-warm px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-hero text-primary-foreground shadow-glow">
            <Refrigerator className="h-5 w-5" />
          </span>
          SmartFridge<span className="text-primary">AI</span>
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
