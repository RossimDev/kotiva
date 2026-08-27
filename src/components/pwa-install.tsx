import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PWAInstall() {
  const [ev, setEv] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-dismissed") === "1") { setHidden(true); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setEv(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!ev || hidden) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-soft backdrop-blur">
      <Download className="h-4 w-4 text-primary" />
      <span className="text-sm">Instale o Kotiva no seu celular</span>
      <Button size="sm" onClick={async () => { await ev.prompt(); setHidden(true); }}>Instalar</Button>
      <button aria-label="Fechar" onClick={() => { localStorage.setItem("pwa-dismissed", "1"); setHidden(true); }}><X className="h-4 w-4 text-muted-foreground" /></button>
    </div>
  );
}
