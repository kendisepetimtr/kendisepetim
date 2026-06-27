export const NOTIFICATION_SOUND_IDS = ["classic", "soft", "chime"] as const;

export type NotificationSoundId = (typeof NOTIFICATION_SOUND_IDS)[number];

export type TenantNotificationSettings = {
  soundEnabled: boolean;
  soundId: NotificationSoundId;
  toastEnabled: boolean;
  alertOnOrderCreated: boolean;
  alertOnBillRequested: boolean;
};

export const NOTIFICATION_SOUND_OPTIONS: {
  id: NotificationSoundId;
  label: string;
  description: string;
}[] = [
  { id: "classic", label: "Klasik", description: "Çift kısa bip — net ve dikkat çekici" },
  { id: "soft", label: "Yumuşak", description: "Tek ton, alçak ses — sakin ortamlar için" },
  { id: "chime", label: "Zil", description: "Üç notalı melodi — restoran zili hissi" },
];

export const DEFAULT_NOTIFICATION_SETTINGS: TenantNotificationSettings = {
  soundEnabled: true,
  soundId: "classic",
  toastEnabled: true,
  alertOnOrderCreated: true,
  alertOnBillRequested: true,
};

export function parseNotificationSettings(raw: unknown): TenantNotificationSettings {
  const base = DEFAULT_NOTIFICATION_SETTINGS;
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const soundId = NOTIFICATION_SOUND_IDS.includes(o.soundId as NotificationSoundId)
    ? (o.soundId as NotificationSoundId)
    : base.soundId;
  return {
    soundEnabled: o.soundEnabled !== false,
    soundId,
    toastEnabled: o.toastEnabled !== false,
    alertOnOrderCreated: o.alertOnOrderCreated !== false,
    alertOnBillRequested: o.alertOnBillRequested !== false,
  };
}

const ALERT_ACTIONS = new Set(["order_created", "bill_requested"]);

export function shouldAlertForAction(
  action: string,
  settings: TenantNotificationSettings,
): boolean {
  if (action === "order_created") return settings.alertOnOrderCreated;
  if (action === "bill_requested") return settings.alertOnBillRequested;
  return ALERT_ACTIONS.has(action);
}
