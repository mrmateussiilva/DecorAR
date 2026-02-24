"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useEditorStore } from "@/store/useEditorStore";
import { XR_RENDERER_OPTIONS } from "@/lib/xr/config";
import { PanelPlane } from "./PanelPlane";

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
  const panels = useEditorStore((state) => state.panels);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectPanel = useEditorStore((state) => state.selectPanel);

  return (
    <section className="min-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/20">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.5, 3.2, 6.5], fov: 46, near: 0.1, far: 100 }}
        onCreated={({ gl, scene }) => {
          gl.xr.enabled = XR_RENDERER_OPTIONS.enabled;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          scene.background = new THREE.Color("#020617");
        }}
        onPointerMissed={() => selectPanel(null)}
      >
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

        {panels.map((panel) => (
          <PanelPlane
            key={panel.id}
            panel={panel}
            isSelected={panel.id === selectedId}
            transformMode={transformMode}
          />
        ))}

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
      </Canvas>
    </section>
  );
}
