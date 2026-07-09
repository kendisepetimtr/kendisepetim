import type { NotificationSoundId } from "@/lib/notification-settings";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone(freq: number, start: number, duration: number, volume = 0.15) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

export async function playNotificationSound(soundId: NotificationSoundId): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  if (soundId === "classic") {
    playTone(880, 0, 0.12, 0.18);
    playTone(1100, 0.15, 0.12, 0.18);
    return;
  }

  if (soundId === "soft") {
    playTone(520, 0, 0.35, 0.1);
    return;
  }

  // chime
  playTone(660, 0, 0.18, 0.14);
  playTone(880, 0.2, 0.18, 0.14);
  playTone(1100, 0.4, 0.22, 0.12);
}

const DEFAULT_REPEAT_INTERVAL_MS = 5000;

let repeatTimer: number | null = null;
let repeatSoundId: NotificationSoundId = "classic";

/** Sipariş görülene kadar periyodik ses çalar. */
export function startRepeatingNotificationSound(
  soundId: NotificationSoundId,
  intervalMs = DEFAULT_REPEAT_INTERVAL_MS,
): void {
  stopRepeatingNotificationSound();
  repeatSoundId = soundId;
  void playNotificationSound(soundId);
  repeatTimer = window.setInterval(() => {
    void playNotificationSound(repeatSoundId);
  }, intervalMs);
}

export function stopRepeatingNotificationSound(): void {
  if (repeatTimer !== null) {
    window.clearInterval(repeatTimer);
    repeatTimer = null;
  }
}

export function isRepeatingNotificationSound(): boolean {
  return repeatTimer !== null;
}
