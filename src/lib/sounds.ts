/** Biblioteca de sons de alerta do Kotiva (gerados via WebAudio, sem assets externos). */
export const SOUND_LIBRARY = [
  { value: "classico", label: "Clássico (bip duplo)" },
  { value: "sino", label: "Sino suave" },
  { value: "digital", label: "Alarme digital" },
  { value: "marimba", label: "Marimba" },
  { value: "sirene", label: "Sirene curta" },
] as const;

export type SoundId = (typeof SOUND_LIBRARY)[number]["value"] | "custom";

const CUSTOM_KEY = "kotiva:timer:custom-sound";
const DEFAULT_KEY = "kotiva:timer:default-sound";

export function getDefaultSound(): SoundId {
  if (typeof localStorage === "undefined") return "classico";
  return (localStorage.getItem(DEFAULT_KEY) as SoundId) || "classico";
}

export function setDefaultSound(id: SoundId) {
  if (typeof localStorage !== "undefined") localStorage.setItem(DEFAULT_KEY, id);
}

export function getCustomSound(): { name: string; data: string } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as { name: string; data: string }) : null;
  } catch {
    return null;
  }
}

export function saveCustomSound(name: string, data: string) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify({ name, data }));
}

export function clearCustomSound() {
  localStorage.removeItem(CUSTOM_KEY);
}

const PATTERNS: Record<string, { freq: number; dur: number; gap: number; type: OscillatorType; times: number }> = {
  classico: { freq: 880, dur: 0.18, gap: 0.12, type: "square", times: 4 },
  sino: { freq: 1320, dur: 0.6, gap: 0.25, type: "sine", times: 3 },
  digital: { freq: 1600, dur: 0.09, gap: 0.07, type: "sawtooth", times: 8 },
  marimba: { freq: 660, dur: 0.25, gap: 0.1, type: "triangle", times: 5 },
  sirene: { freq: 520, dur: 0.5, gap: 0.05, type: "sine", times: 4 },
};

/** Toca o som de alerta escolhido. Retorna uma função para interromper. */
export function playAlarm(sound: SoundId = getDefaultSound()): () => void {
  if (typeof window === "undefined") return () => {};

  if (sound === "custom") {
    const custom = getCustomSound();
    if (custom) {
      const audio = new Audio(custom.data);
      audio.play().catch(() => {});
      return () => { audio.pause(); audio.currentTime = 0; };
    }
    sound = "classico";
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  const p = PATTERNS[sound] ?? PATTERNS.classico;
  let t = ctx.currentTime;

  for (let i = 0; i < p.times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(sound === "sirene" ? p.freq + (i % 2 ? 260 : 0) : p.freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + p.dur);
    t += p.dur + p.gap;
  }

  return () => { ctx.close().catch(() => {}); };
}
