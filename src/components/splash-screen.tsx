import { useEffect, useState } from "react";
import kotivaMark from "@/assets/kotiva-mark.png.asset.json";

/** Splash inicial: gradiente roxo profundo + logo com glow e entrada suave. */
export function SplashScreen({ duration = 1400 }: { duration?: number }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("kotiva-splash") === "done") {
      setVisible(false);
      return;
    }
    const t1 = window.setTimeout(() => setLeaving(true), duration);
    const t2 = window.setTimeout(() => {
      setVisible(false);
      window.sessionStorage.setItem("kotiva-splash", "done");
    }, duration + 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-500"
      style={{
        opacity: leaving ? 0 : 1,
        background:
          "radial-gradient(120% 90% at 50% -10%, oklch(0.42 0.22 288) 0%, oklch(0.24 0.16 285) 38%, oklch(0.12 0.07 285) 70%, oklch(0.08 0.04 285) 100%)",
      }}
    >
      <div className="aurora-blob absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/35 blur-[120px]" />
      <div className="aurora-blob absolute bottom-[-140px] right-[-80px] h-[380px] w-[380px] rounded-full bg-[oklch(0.55_0.2_255)]/30 blur-[110px]" />

      <div className="relative flex flex-col items-center gap-5 splash-enter">
        <div className="relative">
          <div className="absolute inset-0 -m-8 rounded-full bg-primary/40 blur-3xl animate-glow-pulse" />
          <img
            src={kotivaMark.url}
            alt=""
            className="relative h-24 w-24 animate-float drop-shadow-[0_18px_45px_oklch(0.55_0.25_288_/_0.75)]"
          />
        </div>
        <div className="text-center">
          <div className="font-display text-3xl font-extrabold tracking-[0.28em] text-white/95 drop-shadow-[0_2px_20px_oklch(0.55_0.25_288_/_0.9)]">
            KOTIVA
          </div>
          <p className="mt-2 text-xs tracking-widest text-white/50">ORGANIZE. PLANEJE. VIVA MELHOR.</p>
        </div>
        <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="splash-bar h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      </div>
    </div>
  );
}
