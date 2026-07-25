import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";

export function BarcodeScanner({ open, onOpenChange, onDetected }: { open: boolean; onOpenChange: (v: boolean) => void; onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const reader = new BrowserMultiFormatReader();
    let active = true;
    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
        if (!back) throw new Error("Nenhuma câmera encontrada");
        if (!active || !videoRef.current) return;
        controlsRef.current = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current, (result, err, controls) => {
          if (result) {
            controls.stop();
            onDetected(result.getText());
            onOpenChange(false);
          }
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao acessar câmera");
      }
    })();
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Escanear código de barras</DialogTitle></DialogHeader>
        {error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">Aponte a câmera para o código de barras do produto.</p>
        <Button variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
      </DialogContent>
    </Dialog>
  );
}
