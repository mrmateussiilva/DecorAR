/**
 * Estado global do fluxo AR.
 * Fluxo: idle → checking-support → ready-to-start → scanning → surface-found → placed | exited
 */
export type ARState =
  | "idle"
  | "checking-support"
  | "ready-to-start"
  | "scanning"
  | "surface-found"
  | "placed"
  | "exited";

export type QuaternionTuple = [number, number, number, number];

export type HitPoseSnapshot = {
  position: [number, number, number];
  quaternion: QuaternionTuple;
};

export type XRSupportStatus = "checking" | "supported" | "unsupported";

export const AR_STATE_MESSAGES: Record<ARState, string> = {
  idle: "Verificando suporte a AR...",
  "checking-support": "Verificando suporte a AR...",
  "ready-to-start": 'Pronto para AR. Toque em "Enter AR Mode" em um dispositivo compatível.',
  scanning: "Mova o dispositivo para detectar uma superfície.",
  "surface-found": "Superfície detectada. Toque na tela para posicionar a cena.",
  placed: "AR ativo. Cena posicionada no ambiente real.",
  exited: "Sessão AR encerrada."
};
