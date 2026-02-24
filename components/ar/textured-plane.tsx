"use client";

import * as THREE from "three";

type TexturedPlaneProps = {
  width: number;
  height: number;
  texture: THREE.Texture | null;
};

export function TexturedPlane({ width, height, texture }: TexturedPlaneProps) {
  return (
    <mesh scale={[width, height, 1]} position={[0, 0, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color="white" map={texture ?? undefined} side={THREE.DoubleSide} />
    </mesh>
  );
}
