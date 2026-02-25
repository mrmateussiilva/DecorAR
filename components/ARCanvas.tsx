"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { XR_RENDERER_OPTIONS } from "@/lib/xr/config";
import { useEditorStore } from "@/store/useEditorStore";
import { useAR } from "@/ar/context";
import { ARSceneRoot, ARReticle, ARContentRenderer } from "@/ar/scene";

type ARCanvasProps = {
  transformMode: "translate" | "rotate";
};

function SubtleGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.18;
      material.depthWrite = false;
    });
  }, []);

  return (
    <gridHelper
      ref={gridRef}
      args={[24, 24, "#334155", "#1e293b"]}
      position={[0, 0.001, 0]}
    />
  );
}

function GroundShadowPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <shadowMaterial transparent opacity={0.12} />
    </mesh>
  );
}

export function ARCanvas({ transformMode }: ARCanvasProps) {
  const ar = useAR();
  const sectionRef = ar.overlayRootRef;
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const selectPanel = useEditorStore((state) => state.selectPanel);

  const isARActive = ar.isSessionActive;
  const showContent = !isARActive || ar.isPlacementLocked;
  const showReticle = isARActive && !ar.isPlacementLocked;

  const handleEnterAR = useCallback(async () => {
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }
    selectPanel(null);
    await ar.startSession(renderer);
  }, [ar, selectPanel]);

  const statusText = useMemo(() => {
    if (isARActive && !ar.isPlacementLocked) {
      return ar.arState === "surface-found"
        ? "Toque para posicionar a cena"
        : "Procurando superfície para posicionamento";
    }
    return ar.message;
  }, [isARActive, ar.isPlacementLocked, ar.arState, ar.message]);

  const badge = useMemo(() => {
    if (!isARActive) return null;
    if (ar.arState === "placed")
      return {
        label: "Posicionado",
        className: "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
      };
    if (ar.arState === "surface-found")
      return {
        label: "Superfície encontrada",
        className: "border-sky-300/30 bg-sky-400/15 text-sky-200"
      };
    return {
      label: "Escaneando",
      className: "border-amber-300/30 bg-amber-400/15 text-amber-200"
    };
  }, [isARActive, ar.arState]);

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="relative min-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/20"
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.5, 3.2, 6.5], fov: 46, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          rendererRef.current = gl;
          gl.xr.enabled = XR_RENDERER_OPTIONS.enabled;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onPointerMissed={() => selectPanel(null)}
      >
        {!isARActive ? <color attach="background" args={["#020617"]} /> : null}

        {isARActive ? (
          <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[2, 4, 3]} intensity={0.45} />
          </>
        ) : (
          <>
            <ambientLight intensity={0.45} />
            <directionalLight
              castShadow
              position={[5, 8, 4]}
              intensity={1.15}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0001}
              shadow-normalBias={0.02}
              shadow-camera-near={1}
              shadow-camera-far={30}
              shadow-camera-left={-12}
              shadow-camera-right={12}
              shadow-camera-top={12}
              shadow-camera-bottom={-12}
            />
            <directionalLight position={[-6, 4, -5]} intensity={0.35} />
            <directionalLight position={[0, 3, -8]} intensity={0.15} />
            <GroundShadowPlane />
            <SubtleGrid />
          </>
        )}

        <ARSceneRoot
          position={ar.sceneRootPosition}
          quaternion={ar.sceneRootQuaternion}
          visible={showContent}
        >
          <ARContentRenderer transformMode={transformMode} arActive={isARActive} />
        </ARSceneRoot>

        {showReticle ? <ARReticle ref={ar.reticleRef as React.RefObject<THREE.Group>} /> : null}

        {!isARActive ? (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={2}
            maxDistance={20}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2 - 0.05}
            rotateSpeed={0.8}
            zoomSpeed={0.9}
            target={[0, 1, 0]}
            screenSpacePanning={false}
          />
        ) : null}
      </Canvas>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-between gap-3">
        <div className="pointer-events-auto max-w-[min(100%,26rem)] rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 backdrop-blur">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-100">{isARActive ? "AR Mode" : "WebXR AR"}</p>
            {badge ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badge.className}`}
              >
                {badge.label}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-slate-300">{statusText}</p>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-start gap-2">
          {isARActive ? (
            <>
              {ar.isPlacementLocked ? (
                <button
                  type="button"
                  onClick={ar.resetPlacement}
                  className="rounded-lg border border-sky-300/20 bg-sky-400/15 px-3 py-2 text-sm font-medium text-sky-100 backdrop-blur transition hover:bg-sky-400/20"
                >
                  Reposicionar
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void ar.endSession()}
                className="rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-slate-900"
              >
                Exit AR Mode
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnterAR()}
              disabled={!ar.canStartAR}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                ar.canStartAR
                  ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
                  : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              Enter AR Mode
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
