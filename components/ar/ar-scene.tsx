"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { XR_RENDERER_OPTIONS } from "@/lib/xr/config";
import { TexturedPlane } from "./textured-plane";

type ARSceneProps = {
  width: number;
  height: number;
  texture: THREE.Texture | null;
};

export function ARScene({ width, height, texture }: ARSceneProps) {
  return (
    <section className="min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/20">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        onCreated={({ gl }) => {
          gl.xr.enabled = XR_RENDERER_OPTIONS.enabled;
        }}
      >
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <directionalLight position={[-2, -1, 2]} intensity={0.4} />

        <TexturedPlane width={width} height={height} texture={texture} />

        <gridHelper args={[6, 12, "#334155", "#1e293b"]} position={[0, -1.5, 0]} />
        <axesHelper args={[1.5]} />
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </section>
  );
}
