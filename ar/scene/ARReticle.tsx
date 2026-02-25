"use client";

import { forwardRef } from "react";
import * as THREE from "three";

/**
 * Reticle visual (anel + círculo) para indicar onde a cena será posicionada.
 * Desacoplado do conteúdo 3D: position/quaternion são atualizados externamente
 * via ref (pelo XRHitTestManager no frame loop).
 * Só deve ser montado quando sessão AR está ativa e placement não está locked.
 */
export const ARReticle = forwardRef<THREE.Group, Record<string, unknown>>(function ARReticle(
  _,
  ref
) {
  return (
    <group ref={ref} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 40]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.04, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});
