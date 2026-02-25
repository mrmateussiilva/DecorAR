"use client";

import { useEffect, useRef } from "react";
import type { HitPoseSnapshot } from "./types";

export type XRHitTestManagerOptions = {
  /** Sessão WebXR ativa. Hit-test só roda quando session != null. */
  session: XRSession | null;
  /** Ref onde o pose do hit atual será escrito (apenas leitura pelo consumidor). */
  latestHitPoseRef: React.MutableRefObject<HitPoseSnapshot | null>;
  /** Ref do grupo/mesh do reticle para atualizar position e quaternion. */
  reticleRef: React.RefObject<import("three").Object3D | null>;
  /** Quando true, reticle não é atualizado e hit não é reportado como disponível. */
  placementLockedRef: React.MutableRefObject<boolean>;
  /** Chamado quando há hit válido (surface encontrada). */
  onSurfaceFound: (found: boolean) => void;
  /** Chamado em erro de setup (ex.: hit-test não suportado). */
  onError: (message: string) => void;
};

/**
 * Gerencia hit-test source e loop de frame XR.
 * - Cria hitTestSource uma vez quando a sessão está ativa.
 * - No frame: lê getHitTestResults, escreve em latestHitPoseRef, atualiza reticle, chama onSurfaceFound.
 * - Cleanup completo ao desmontar ou quando session termina.
 * - Lógica dentro do requestAnimationFrame é mínima (apenas leitura de hit e escrita em refs).
 */
export function useXRHitTestManager({
  session,
  latestHitPoseRef,
  reticleRef,
  placementLockedRef,
  onSurfaceFound,
  onError
}: XRHitTestManagerOptions): void {
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const localFloorRef = useRef<XRReferenceSpace | null>(null);
  const viewerRef = useRef<XRReferenceSpace | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const hitStateRef = useRef(false);
  const onSurfaceFoundRef = useRef(onSurfaceFound);
  const onErrorRef = useRef(onError);
  onSurfaceFoundRef.current = onSurfaceFound;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!session) {
      latestHitPoseRef.current = null;
      if (reticleRef.current) reticleRef.current.visible = false;
      onSurfaceFoundRef.current(false);
      return;
    }

    let disposed = false;

    const cleanup = () => {
      if (frameIdRef.current !== null) {
        try {
          session.cancelAnimationFrame(frameIdRef.current);
        } catch {
          /* session may already be closed */
        }
        frameIdRef.current = null;
      }
      hitTestSourceRef.current?.cancel();
      hitTestSourceRef.current = null;
      localFloorRef.current = null;
      viewerRef.current = null;
      latestHitPoseRef.current = null;
      if (reticleRef.current) reticleRef.current.visible = false;
      if (hitStateRef.current) {
        hitStateRef.current = false;
        onSurfaceFoundRef.current(false);
      }
    };

    const setup = async () => {
      if (!session.requestHitTestSource) {
        onErrorRef.current("Hit-test não suportado nesta sessão WebXR.");
        cleanup();
        return;
      }

      try {
        const localFloor = await session.requestReferenceSpace("local-floor");
        if (disposed) return;
        localFloorRef.current = localFloor;

        const viewer = await session.requestReferenceSpace("viewer");
        if (disposed) return;
        viewerRef.current = viewer;

        const source = await session.requestHitTestSource({ space: viewer });
        if (disposed) return;
        hitTestSourceRef.current = source ?? null;

        if (!hitTestSourceRef.current) {
          onErrorRef.current("Falha ao criar hit-test source.");
          cleanup();
          return;
        }

        const onXRFrame = (_t: DOMHighResTimeStamp, frame: XRFrame) => {
          if (disposed) return;

          frameIdRef.current = session.requestAnimationFrame(onXRFrame);

          const src = hitTestSourceRef.current;
          const floor = localFloorRef.current;
          if (!src || !floor) return;

          const results = frame.getHitTestResults(src);
          const hit = results[0];
          const pose = hit?.getPose(floor);

          if (!pose) {
            latestHitPoseRef.current = null;
            if (reticleRef.current && !placementLockedRef.current) reticleRef.current.visible = false;
            if (hitStateRef.current) {
              hitStateRef.current = false;
              onSurfaceFoundRef.current(false);
            }
            return;
          }

          const { position, orientation } = pose.transform;
          latestHitPoseRef.current = {
            position: [position.x, position.y, position.z],
            quaternion: [orientation.x, orientation.y, orientation.z, orientation.w]
          };

          if (!hitStateRef.current) {
            hitStateRef.current = true;
            onSurfaceFoundRef.current(true);
          }

          if (placementLockedRef.current) {
            if (reticleRef.current) reticleRef.current.visible = false;
            return;
          }

          if (reticleRef.current) {
            reticleRef.current.visible = true;
            reticleRef.current.position.set(position.x, position.y, position.z);
            reticleRef.current.quaternion.set(
              orientation.x,
              orientation.y,
              orientation.z,
              orientation.w
            );
          }
        };

        frameIdRef.current = session.requestAnimationFrame(onXRFrame);
      } catch {
        onErrorRef.current(
          "Falha ao inicializar hit-test. Verifique suporte WebXR/hit-test no dispositivo."
        );
        cleanup();
      }
    };

    const handleEnd = () => cleanup();
    session.addEventListener("end", handleEnd);
    void setup();

    return () => {
      disposed = true;
      session.removeEventListener("end", handleEnd);
      cleanup();
    };
  }, [
    session,
    latestHitPoseRef,
    reticleRef,
    placementLockedRef,
    onSurfaceFound,
    onError
  ]);
}
