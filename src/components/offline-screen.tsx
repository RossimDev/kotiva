import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import kotivaMark from "@/assets/kotiva-mark.png.asset.json";

/** Tela exibida quando o dispositivo perde a conexão. */
export function OfflineScreen() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Sem conexão"
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-black px-6 animate-fade-in"
    >
      <div className="aurora-blob absolute -top-32 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-primary/25 blur-[130px]" />
      <div className="aurora-blob absolute bottom-[-160px] left-[-60px] h-[360px] w-[360px] rounded-full bg-[oklch(0.5_0.2_260)]/25 blur-[120px]" />
      <div className="particles pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-sm text-center">
        <div className="relative mx-auto h-24 w-24">
          <span className="absolute inset-0 rounded-full border border-primary/40 offline-ping" />
          <span className="absolute inset-0 rounded-full border border-primary/25 offline-ping [animation-delay:1s]" />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/15 backdrop-blur">
            <WifiOff className="h-9 w-9 text-primary animate-glow-pulse" />
          </div>
        </div>

        <img src={kotivaMark.url} alt="" className="mx-auto mt-8 h-10 w-10 opacity-80" />
        <h1 className="mt-3 font-display text-2xl font-extrabold tracking-wide text-white">
          Você está offline
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Sem conexão com a internet. O Kotiva volta automaticamente assim que a rede retornar.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    </div>
  );
}
