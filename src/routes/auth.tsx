import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import kotivaMark from "@/assets/kotiva-mark.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { guardAuthAttempt } from "@/lib/security.functions";
import { requestVerificationCode, confirmVerificationCode } from "@/lib/verification.functions";

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

const SPAM_NOTICE = "Se a mensagem não chegar, verifique sua caixa de spam.";

type Step = "signin" | "signup" | "verify" | "forgot" | "reset";
type Channel = "email" | "sms";

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={5}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
      placeholder="00000"
      className="text-center font-display text-3xl tracking-[0.6em]"
      aria-label="Código de verificação de 5 dígitos"
    />
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(search.mode ?? "signin");
  const [channel, setChannel] = useState<Channel>("email");
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const guard = useServerFn(guardAuthAttempt);
  const requestCode = useServerFn(requestVerificationCode);
  const confirmCode = useServerFn(confirmVerificationCode);

  useEffect(() => { if (user) navigate({ to: "/app/dashboard" }); }, [user, navigate]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const err = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    toast.error(msg.includes("Invalid login") ? "E-mail ou senha inválidos" : msg);
  };

  const sendCode = async (purpose: "signup" | "password_reset") => {
    await requestCode({
      data: {
        purpose,
        channel,
        email: form.email.trim(),
        phone: channel === "sms" ? form.phone.trim() : undefined,
        name: purpose === "signup" ? form.name.trim() : undefined,
        password: purpose === "signup" ? form.password : undefined,
      },
    });
    setCooldown(45);
    toast.success(channel === "sms" ? "Código enviado por SMS." : "Código enviado por e-mail.");
  };

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = z.string().email().safeParse(form.email.trim());
      if (parsed.success) {
        const check = await guard({ data: { action: "signin", email: parsed.data } });
        if (!check.allowed) throw new Error(check.message);
      }
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (error) throw error;
      toast.success("Bem-vindo de volta!");
    } catch (e) { err(e); } finally { setLoading(false); }
  };

  const submitSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsed = z.object({
        email: z.string().email("E-mail inválido"),
        password: z.string().min(6, "Mínimo 6 caracteres"),
        name: z.string().min(1, "Informe seu nome").max(80),
      }).safeParse({ email: form.email.trim(), password: form.password, name: form.name.trim() });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (channel === "sms" && !/^\+?[1-9]\d{7,14}$/.test(form.phone.trim())) {
        throw new Error("Informe o celular com DDI e DDD (ex: +5511999999999)");
      }
      const check = await guard({ data: { action: "signup", email: parsed.data.email } });
      if (!check.allowed) throw new Error(check.message);
      await sendCode("signup");
      setStep("verify");
    } catch (e) { err(e); } finally { setLoading(false); }
  };

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmCode({ data: { purpose: "signup", email: form.email.trim(), code } });
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (error) throw error;
      toast.success("Conta verificada! Bem-vindo ao Kotiva.");
    } catch (e) { err(e); } finally { setLoading(false); }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendCode("password_reset");
      setStep("reset");
    } catch (e) { err(e); } finally { setLoading(false); }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (newPassword.length < 6) throw new Error("A nova senha precisa ter ao menos 6 caracteres");
      await confirmCode({ data: { purpose: "password_reset", email: form.email.trim(), code, newPassword } });
      toast.success("Senha redefinida! Faça login.");
      setForm({ ...form, password: "" });
      setCode("");
      setNewPassword("");
      setStep("signin");
    } catch (e) { err(e); } finally { setLoading(false); }
  };

  const channelPicker = (
    <div className="space-y-2">
      <Label>Como quer receber o código de verificação?</Label>
      <div className="grid grid-cols-2 gap-2">
        {([["email", Mail, "E-mail"], ["sms", MessageSquare, "SMS"]] as const).map(([value, Icon, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setChannel(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              channel === value ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {channel === "sms" && (
        <div>
          <Label htmlFor="phone">Celular (com DDI)</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+5511999999999" autoComplete="tel" />
        </div>
      )}
    </div>
  );

  const title = { signin: "Entrar", signup: "Criar conta", verify: "Verificação", forgot: "Recuperar senha", reset: "Nova senha" }[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-warm px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex animate-fade-in items-center justify-center gap-2 font-display text-xl font-bold tracking-tight">
          <img src={kotivaMark.url} alt="Kotiva" className="h-10 w-10" />
          <span className="text-primary">KOTIVA</span>
        </Link>
        <Card className="animate-scale-in stagger-1 p-8 shadow-soft">
          <h1 className="font-display text-2xl font-bold">{title}</h1>

          {step === "signin" && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Acesse seu painel.</p>
              <form onSubmit={submitSignIn} className="mt-6 space-y-4">
                <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></div>
                <div><Label htmlFor="password">Senha</Label><PasswordInput id="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} autoComplete="current-password" /></div>
                <Button type="submit" className="w-full shadow-glow" disabled={loading}>{loading ? "Aguarde..." : "Entrar"}</Button>
              </form>
              <button className="mt-3 text-sm text-primary hover:underline" onClick={() => setStep("forgot")}>Esqueci minha senha</button>
            </>
          )}

          {step === "signup" && (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Comece gratuitamente em segundos.</p>
              <form onSubmit={submitSignUp} className="mt-6 space-y-4">
                <div><Label htmlFor="name">Nome</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={80} /></div>
                <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></div>
                <div><Label htmlFor="password">Senha</Label><PasswordInput id="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} autoComplete="new-password" /></div>
                {channelPicker}
                <Button type="submit" className="w-full shadow-glow" disabled={loading}>{loading ? "Enviando código..." : "Criar conta"}</Button>
              </form>
            </>
          )}

          {step === "verify" && (
            <form onSubmit={submitVerify} className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-primary/10 p-3 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Enviamos um código de 5 dígitos {channel === "sms" ? `para ${form.phone}` : `para ${form.email}`}. Ele expira em 10 minutos.</span>
              </div>
              <CodeInput value={code} onChange={setCode} />
              <Button type="submit" className="w-full shadow-glow" disabled={loading || code.length !== 5}>{loading ? "Verificando..." : "Confirmar código"}</Button>
              <Button type="button" variant="ghost" className="w-full" disabled={cooldown > 0} onClick={() => sendCode("signup").catch(err)}>
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{SPAM_NOTICE}</p>
            </form>
          )}

          {step === "forgot" && (
            <form onSubmit={submitForgot} className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Enviaremos um código de 5 dígitos para você criar uma nova senha.</p>
              <div><Label htmlFor="email">E-mail da conta</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></div>
              {channelPicker}
              <Button type="submit" className="w-full shadow-glow" disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("signin")}>Voltar ao login</Button>
              <p className="text-center text-xs text-muted-foreground">{SPAM_NOTICE}</p>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={submitReset} className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Digite o código recebido e defina sua nova senha.</p>
              <CodeInput value={code} onChange={setCode} />
              <div><Label htmlFor="newpass">Nova senha</Label><PasswordInput id="newpass" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" /></div>
              <Button type="submit" className="w-full shadow-glow" disabled={loading || code.length !== 5}>{loading ? "Salvando..." : "Redefinir senha"}</Button>
              <Button type="button" variant="ghost" className="w-full" disabled={cooldown > 0} onClick={() => sendCode("password_reset").catch(err)}>
                {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{SPAM_NOTICE}</p>
            </form>
          )}

          {(step === "signin" || step === "signup") && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" /></div>
              <Button type="button" variant="outline" className="w-full" onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth/callback` });
                if (result.error) { toast.error("Falha no login com Google"); return; }
                if (result.redirected) return;
                navigate({ to: "/app/dashboard" });
              }}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.4 39.6 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.5 5.3C41.6 35 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                Continuar com Google
              </Button>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {step === "signup" ? "Já tem conta?" : "Não tem conta?"}{" "}
                <button className="font-medium text-primary hover:underline" onClick={() => setStep(step === "signup" ? "signin" : "signup")}>
                  {step === "signup" ? "Entrar" : "Criar agora"}
                </button>
              </div>
            </>
          )}
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
