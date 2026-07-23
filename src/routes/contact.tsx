import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Send } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contato — SmartFridge AI" },
      { name: "description", content: "Fale com a equipe do SmartFridge AI. Estamos aqui para ajudar você a aproveitar melhor sua cozinha." },
      { property: "og:title", content: "Contato — SmartFridge AI" },
      { property: "og:description", content: "Tire suas dúvidas, envie sugestões ou peça suporte." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  message: z.string().trim().min(5, "Mensagem muito curta").max(2000),
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setLoading(false);
    if (error) return toast.error("Erro ao enviar. Tente novamente.");
    toast.success("Mensagem enviada! Retornaremos em breve.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl font-extrabold">Vamos conversar</h1>
        <p className="mt-3 text-muted-foreground">Tem dúvidas, sugestões ou precisa de suporte? Envie sua mensagem.</p>
        <div className="mt-8 space-y-4 text-sm">
          <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> contato@smartfridge.ai</div>
          <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> São Paulo, Brasil</div>
        </div>
      </div>
      <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="space-y-4">
          <div><Label htmlFor="n">Nome</Label><Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></div>
          <div><Label htmlFor="e">E-mail</Label><Input id="e" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} /></div>
          <div><Label htmlFor="m">Mensagem</Label><Textarea id="m" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} /></div>
          <Button type="submit" className="w-full shadow-glow" disabled={loading}>
            {loading ? "Enviando..." : (<>Enviar <Send className="ml-2 h-4 w-4" /></>)}
          </Button>
        </div>
      </form>
    </div>
  );
}
