"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEditorStore } from "@/store/useEditorStore";
import { XR_RENDERER_OPTIONS } from "@/lib/xr/config";
import { PanelPlane } from "./PanelPlane";

type ARCanvasProps = {
  transformMode: "translate" | "rotate";
};

export function ARCanvas({ transformMode }: ARCanvasProps) {
  const panels = useEditorStore((state) => state.panels);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectPanel = useEditorStore((state) => state.selectPanel);

  return (
    <section className="min-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/20">
      <Canvas
        shadows={false}
        camera={{ position: [4, 3, 6], fov: 50 }}
        onCreated={({ gl }) => {
          gl.xr.enabled = XR_RENDERER_OPTIONS.enabled;
        }}
        onPointerMissed={() => selectPanel(null)}
      >
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 3]} intensity={1.1} />
        <directionalLight position={[-3, 2, -4]} intensity={0.35} />

        <gridHelper args={[20, 20, "#334155", "#1e293b"]} position={[0, 0, 0]} />
        <axesHelper args={[1.5]} />

        {panels.map((panel) => (
          <PanelPlane
            key={panel.id}
            panel={panel}
            isSelected={panel.id === selectedId}
            transformMode={transformMode}
          />
        ))}

        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </section>
  );
}
