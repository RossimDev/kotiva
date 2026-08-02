import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function PWAInstall() {
  const [ev, setEv] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-dismissed") === "1" || isStandalone()) return;
    setHidden(false);
    if (isIOS()) setIos(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEv(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setHidden(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (!ev && !ios)) return null;

  const dismiss = () => {
    localStorage.setItem("pwa-dismissed", "1");
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-2xl border bg-background/95 px-4 py-2.5 shadow-soft backdrop-blur">
      <Download className="h-4 w-4 shrink-0 text-primary" />
      {ios ? (
        <span className="text-sm">
          Instale o Kotiva: toque em <Share className="inline h-3.5 w-3.5" /> e depois em{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </span>
      ) : (
        <>
          <span className="text-sm">Instale o Kotiva como aplicativo</span>
          <Button
            size="sm"
            onClick={async () => {
              await ev!.prompt();
              setHidden(true);
            }}
          >
            Instalar
          </Button>
        </>
      )}
      <button aria-label="Fechar" onClick={dismiss}>
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
