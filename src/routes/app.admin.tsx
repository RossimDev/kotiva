import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  Mail,
  Package,
  ChefHat,
  Shield,
  ShoppingCart,
  Crown,
  Barcode,
  PawPrint,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminStats,
  grantAdmin,
  listAdmins,
  listAuditLog,
  revokeAdmin,
  setUserPlan,
  verifyAdminAccess,
  type AdminStats,
  type AuditEntry,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Admin — Kotiva" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Msg = { id: string; name: string; email: string; message: string; created_at: string };
type AdminsData = {
  admins: Array<{ userId: string; email: string }>;
  invites: Array<{ email: string; createdAt: string }>;
};

function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [admins, setAdmins] = useState<AdminsData>({ admins: [], invites: [] });
  const [email, setEmail] = useState("");
  const [granting, setGranting] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [planEmail, setPlanEmail] = useState("");
  const [planId, setPlanId] = useState<"pro" | "family" | "free">("pro");
  const [planMonths, setPlanMonths] = useState(12);
  const [savingPlan, setSavingPlan] = useState(false);

  const fetchStats = useServerFn(getAdminStats);
  const fetchAdmins = useServerFn(listAdmins);
  const doGrant = useServerFn(grantAdmin);
  const doRevoke = useServerFn(revokeAdmin);
  const doSetPlan = useServerFn(setUserPlan);
  const fetchAudit = useServerFn(listAuditLog);
  const checkAdmin = useServerFn(verifyAdminAccess);

  const refresh = useCallback(async () => {
    const [s, a, l] = await Promise.all([fetchStats({}), fetchAdmins({}), fetchAudit({})]);
    setStats(s);
    setAdmins(a);
    setAudit(l);
  }, [fetchStats, fetchAdmins, fetchAudit]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      // Verificação server-side: mesmo com a URL direta, sem role admin não há acesso.
      try {
        const { isAdmin } = await checkAdmin({});
        if (!alive) return;
        if (!isAdmin) {
          setOk(false);
          navigate({ to: "/app/dashboard" });
          return;
        }
        setOk(true);
        const { data: m } = await supabase
          .from("contact_messages")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        if (!alive) return;
        setMsgs((m as Msg[]) ?? []);
        await refresh();
      } catch (e) {
        if (!alive) return;
        setOk(false);
        navigate({ to: "/app/dashboard" });
        toast.error(e instanceof Error ? e.message : "Acesso negado");
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, navigate, refresh, checkAdmin]);

  const grant = async () => {
    if (!email.trim()) return;
    setGranting(true);
    try {
      const res = await doGrant({ data: { email: email.trim() } });
      toast.success(res.message);
      setEmail("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível conceder acesso");
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (target: string) => {
    try {
      await doRevoke({ data: { email: target } });
      toast.success("Acesso removido");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível remover");
    }
  };

  const applyPlan = async () => {
    if (!planEmail.trim()) return;
    setSavingPlan(true);
    try {
      const res = await doSetPlan({
        data: { email: planEmail.trim(), plan: planId, months: planMonths },
      });
      toast.success(res.message);
      setPlanEmail("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o plano");
    } finally {
      setSavingPlan(false);
    }
  };

  if (!ok) return <div className="text-muted-foreground">Verificando permissões...</div>;

  const cards = [
    { label: "Usuários", value: stats?.users ?? 0, icon: Users },
    { label: "Novos (7 dias)", value: stats?.newUsers7d ?? 0, icon: UserPlus },
    { label: "Assinaturas ativas", value: stats?.activeSubscriptions ?? 0, icon: Crown },
    { label: "Administradores", value: stats?.admins ?? 0, icon: Shield },
    { label: "Itens na geladeira", value: stats?.fridgeItems ?? 0, icon: Package },
    { label: "Itens em listas", value: stats?.shoppingItems ?? 0, icon: ShoppingCart },
    { label: "Receitas salvas", value: stats?.recipes ?? 0, icon: ChefHat },
    { label: "Pets cadastrados", value: stats?.pets ?? 0, icon: PawPrint },
    { label: "Códigos na base", value: stats?.barcodes ?? 0, icon: Barcode },
    { label: "Mensagens", value: stats?.messages ?? 0, icon: Mail },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" /> Painel Admin
        </h1>
        <p className="text-muted-foreground">Visão geral do uso do Kotiva.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 hover-lift">
            <c.icon className="h-5 w-5 text-primary" />
            <div className="mt-3 font-display text-3xl font-bold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Novos cadastros (14 dias)</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.signupsByDay ?? []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Conceder acesso de administrador</h2>
        <p className="text-sm text-muted-foreground">
          Informe o e-mail da pessoa. Se ela ainda não tiver conta, o acesso é aplicado no primeiro
          cadastro.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@email.com"
            />
          </div>
          <Button onClick={grant} disabled={granting}>
            <UserPlus className="mr-2 h-4 w-4" /> {granting ? "Concedendo..." : "Conceder admin"}
          </Button>
        </div>

        <div className="mt-5 space-y-2">
          {admins.admins.map((a) => (
            <div
              key={a.userId}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <span className="text-sm">{a.email}</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Admin ativo</Badge>
                {a.email !== user?.email && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revoke(a.email)}
                    aria-label={`Remover ${a.email}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {admins.invites
            .filter(
              (i) => !admins.admins.some((a) => a.email.toLowerCase() === i.email.toLowerCase()),
            )
            .map((i) => (
              <div
                key={i.email}
                className="flex items-center justify-between rounded-lg border border-dashed border-border p-3"
              >
                <span className="text-sm text-muted-foreground">{i.email}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Aguardando cadastro</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revoke(i.email)}
                    aria-label={`Cancelar convite ${i.email}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Atribuir plano manualmente</h2>
        <p className="text-sm text-muted-foreground">
          Libere o plano VIP (Pro) ou Família para qualquer usuário sem passar pelo checkout.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Label className="text-xs">E-mail do usuário</Label>
            <Input
              type="email"
              value={planEmail}
              onChange={(e) => setPlanEmail(e.target.value)}
              placeholder="pessoa@email.com"
            />
          </div>
          <div>
            <Label className="text-xs">Plano</Label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value as "pro" | "family" | "free")}
              className="h-10 w-40 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="pro">VIP (Pro)</option>
              <option value="family">Família</option>
              <option value="free">Remover (Grátis)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Meses</Label>
            <Input
              type="number"
              min={1}
              max={36}
              value={planMonths}
              onChange={(e) => setPlanMonths(Math.min(36, Math.max(1, Number(e.target.value) || 1)))}
              className="w-24"
              disabled={planId === "free"}
            />
          </div>
          <Button onClick={applyPlan} disabled={savingPlan}>
            <Crown className="mr-2 h-4 w-4" /> {savingPlan ? "Aplicando..." : "Aplicar plano"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Log de auditoria</h2>
        <p className="text-sm text-muted-foreground">Ações administrativas sensíveis registradas.</p>
        <div className="mt-4 space-y-2">
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
          ) : (
            audit.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <span>
                  <Badge variant="outline" className="mr-2">
                    {a.action}
                  </Badge>
                  {a.actorEmail ?? "—"} → {a.targetEmail ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("pt-BR")} · {a.details}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Usuários recentes</h2>
        <div className="mt-4 space-y-2">
          {(stats?.recent ?? []).map((u) => (
            <div
              key={u.email}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <span>{u.email}</span>
              <span className="text-xs text-muted-foreground">
                Criado em {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"} ·{" "}
                último acesso{" "}
                {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString("pt-BR") : "nunca"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Mensagens recentes</h2>
        {msgs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma mensagem.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
                <p className="mt-2 text-sm">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
