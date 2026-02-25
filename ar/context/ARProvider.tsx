"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  useXRSessionManager,
  useXRHitTestManager,
  useXRPlacementController
} from "@/ar/core";
import type { Group } from "three";
import type { ARState } from "@/ar/core/types";

type ARContextValue = {
  /** Estado global do fluxo AR. */
  arState: ARState;
  /** Mensagem para UI. */
  message: string;
  /** Sessão ativa (ref estável). */
  sessionRef: React.MutableRefObject<XRSession | null>;
  /** Posição do grupo raiz da cena. */
  sceneRootPosition: [number, number, number];
  /** Quaternion do grupo raiz. */
  sceneRootQuaternion: [number, number, number, number];
  /** Sessão AR está ativa (para re-render quando session muda). */
  isSessionActive: boolean;
  /** Conteúdo só visível quando placed. */
  isPlacementLocked: boolean;
  /** Pode iniciar AR (suporte ok e não está em sessão). */
  canStartAR: boolean;
  /** Inicia sessão; requer renderer (passado pelo Canvas). */
  startSession: (renderer: import("three").WebGLRenderer) => Promise<void>;
  /** Encerra sessão. */
  endSession: () => Promise<void>;
  /** Posiciona cena no hit atual. */
  place: () => void;
  /** Volta ao scanning. */
  resetPlacement: () => void;
  /** Ref para o container dom-overlay (passar para useXRSession). */
  overlayRootRef: React.RefObject<HTMLElement | null>;
  /** Refs estáveis para hit-test e reticle (preenchidos pelo provider). */
  latestHitPoseRef: React.MutableRefObject<{
    position: [number, number, number];
    quaternion: [number, number, number, number];
  } | null>;
  reticleRef: React.RefObject<Group | null>;
};

const ARContext = createContext<ARContextValue | null>(null);

export function useAR(): ARContextValue {
  const ctx = useContext(ARContext);
  if (!ctx) throw new Error("useAR must be used within ARProvider");
  return ctx;
}

export function useAROptional(): ARContextValue | null {
  return useContext(ARContext);
}

type ARProviderProps = {
  children: ReactNode;
};

/**
 * Provider que compõe Session + HitTest + Placement e expõe estado unificado (arState)
 * e ações. Componentes visuais apenas consomem useAR() e não criam sessão diretamente.
 */
export function ARProvider({ children }: ARProviderProps) {
  const overlayRootRef = useRef<HTMLElement | null>(null);
  const latestHitPoseRef = useRef<{
    position: [number, number, number];
    quaternion: [number, number, number, number];
  } | null>(null);
  const reticleRef = useRef<Group | null>(null);

  const [message, setMessage] = useState("Verificando suporte a AR...");

  const placement = useXRPlacementController({
    latestHitPoseRef,
    onPlace: () => {
      setMessage("AR ativo. Cena posicionada no ambiente real.");
    },
    onReset: () => {
      if (reticleRef.current) reticleRef.current.visible = false;
    }
  });

  const [surfaceFound, setSurfaceFound] = useState(false);

  const onSessionEnd = useCallback(() => {
    setSurfaceFound(false);
    placement.setSceneRootPose([0, 0, 0], [0, 0, 0, 1]);
    placement.resetPlacement();
    setMessage("Sessão AR encerrada.");
  }, [placement]);

  const session = useXRSessionManager({
    onSessionEnd,
    onSelect: placement.place
  });

  const handleSurfaceFound = useCallback((found: boolean) => {
    if (placement.placementLockedRef.current) return;
    setSurfaceFound(found);
    setMessage(
      found
        ? "Superfície detectada. Toque na tela para posicionar a cena."
        : "Mova o dispositivo para detectar uma superfície."
    );
  }, [placement.placementLockedRef]);

  const handleHitError = useCallback((msg: string) => {
    setMessage(msg);
  }, []);

  useXRHitTestManager({
    session: session.session,
    latestHitPoseRef,
    reticleRef,
    placementLockedRef: placement.placementLockedRef,
    onSurfaceFound: handleSurfaceFound,
    onError: handleHitError
  });

  const isSessionActive = session.session !== null;
  const canStartAR = session.supportStatus === "supported" && !isSessionActive;

  const arState: ARState = useMemo(() => {
    if (session.supportStatus === "checking") return "checking-support";
    if (!isSessionActive) {
      if (session.supportStatus === "supported") return "ready-to-start";
      return "idle";
    }
    if (placement.placementState === "placed") return "placed";
    if (surfaceFound) return "surface-found";
    return "scanning";
  }, [
    isSessionActive,
    session.supportStatus,
    placement.placementState,
    surfaceFound
  ]);

  const startSessionWithOverlay = useCallback(
    async (renderer: import("three").WebGLRenderer) => {
      placement.resetPlacement();
      setSurfaceFound(false);
      return session.startSession(renderer, overlayRootRef.current ?? undefined);
    },
    [session.startSession, placement]
  );

  const value = useMemo<ARContextValue>(
    () => ({
      arState,
      message: isSessionActive ? message : session.message,
      sessionRef: session.sessionRef,
      sceneRootPosition: placement.sceneRootPosition,
      sceneRootQuaternion: placement.sceneRootQuaternion,
      isSessionActive,
      isPlacementLocked: placement.placementState === "placed",
      canStartAR,
      startSession: startSessionWithOverlay,
      endSession: session.endSession,
      place: placement.place,
      resetPlacement: placement.resetPlacement,
      overlayRootRef,
      latestHitPoseRef,
      reticleRef
    }),
    [
      arState,
      message,
      isSessionActive,
      session.message,
      session.sessionRef,
      session.startSession,
      session.endSession,
      placement.sceneRootPosition,
      placement.sceneRootQuaternion,
      placement.placementState,
      isSessionActive,
      placement.place,
      placement.resetPlacement,
      canStartAR,
      startSessionWithOverlay,
      overlayRootRef,
      latestHitPoseRef,
      reticleRef
    ]
  );

  return <ARContext.Provider value={value}>{children}</ARContext.Provider>;
}
