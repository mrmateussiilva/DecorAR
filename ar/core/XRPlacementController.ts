"use client";

import { useCallback, useRef, useState } from "react";
import type { ARState, HitPoseSnapshot, QuaternionTuple } from "./types";

export type XRPlacementControllerOptions = {
  /** Ref com o último hit pose (preenchido por XRHitTestManager). */
  latestHitPoseRef: React.MutableRefObject<HitPoseSnapshot | null>;
  /** Chamado ao travar placement (ex.: limpar seleção de painel). */
  onPlace?: () => void;
  /** Chamado ao resetar placement. */
  onReset?: () => void;
};

export type XRPlacementControllerResult = {
  /** Estado de placement: scanning | surface-found | placed. */
  placementState: "scanning" | "surface-found" | "placed";
  /** Posição do grupo raiz da cena (após place). */
  sceneRootPosition: [number, number, number];
  /** Rotação do grupo raiz (quaternion). */
  sceneRootQuaternion: QuaternionTuple;
  /** Ref que indica se placement está travado (placed). Usado por hit-test para não atualizar reticle. */
  placementLockedRef: React.MutableRefObject<boolean>;
  /** Trava o conteúdo na pose atual do hit. Só tem efeito se latestHitPoseRef tiver valor. */
  place: () => void;
  /** Volta para scanning e limpa pose do reticle (reticleRef deve ser escondido pelo caller). */
  resetPlacement: () => void;
  /** Seta posição/rotação iniciais (ex.: ao entrar em sessão). */
  setSceneRootPose: (position: [number, number, number], quaternion: QuaternionTuple) => void;
};

/**
 * Controla o estado de placement da cena AR.
 * - Máquina de estados: scanning → surface-found → placed (e voltar para scanning no reset).
 * - place() lê latestHitPoseRef e atualiza sceneRootPosition/Quaternion, depois seta placed.
 * - Nenhuma lógica de sessão ou hit-test; apenas estado e ações.
 */
export function useXRPlacementController(
  options: XRPlacementControllerOptions
): XRPlacementControllerResult {
  const { latestHitPoseRef, onPlace, onReset } = options;
  const placementLockedRef = useRef(false);
  const [placementState, setPlacementState] = useState<"scanning" | "surface-found" | "placed">(
    "scanning"
  );
  const [sceneRootPosition, setSceneRootPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [sceneRootQuaternion, setSceneRootQuaternion] = useState<QuaternionTuple>([0, 0, 0, 1]);

  const place = useCallback(() => {
    const pose = latestHitPoseRef.current;
    if (!pose) return;
    placementLockedRef.current = true;
    setSceneRootPosition(pose.position);
    setSceneRootQuaternion(pose.quaternion);
    setPlacementState("placed");
    onPlace?.();
  }, [latestHitPoseRef, onPlace]);

  const resetPlacement = useCallback(() => {
    placementLockedRef.current = false;
    latestHitPoseRef.current = null;
    setPlacementState("scanning");
    setSceneRootPosition([0, 0, 0]);
    setSceneRootQuaternion([0, 0, 0, 1]);
    onReset?.();
  }, [latestHitPoseRef, onReset]);

  const setSceneRootPose = useCallback(
    (position: [number, number, number], quaternion: QuaternionTuple) => {
      setSceneRootPosition(position);
      setSceneRootQuaternion(quaternion);
    },
    []
  );

  return {
    placementState,
    sceneRootPosition,
    sceneRootQuaternion,
    placementLockedRef,
    place,
    resetPlacement,
    setSceneRootPose
  };
}
