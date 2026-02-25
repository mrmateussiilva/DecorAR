"use client";

import type { ReactNode } from "react";
import type { QuaternionTuple } from "@/ar/core/types";

export type ARSceneRootProps = {
  /** Posição do grupo raiz (ex.: do placement controller). */
  position: [number, number, number];
  /** Rotação em quaternion. */
  quaternion: QuaternionTuple;
  /** Se false, grupo fica invisível (ex.: em AR antes de placed). */
  visible: boolean;
  children: ReactNode;
};

/**
 * Grupo raiz da cena AR. Apenas aplica position/quaternion e visibility.
 * Não controla sessão nem hit-test.
 */
export function ARSceneRoot({
  position,
  quaternion,
  visible,
  children
}: ARSceneRootProps) {
  return (
    <group visible={visible} position={position} quaternion={quaternion}>
      {children}
    </group>
  );
}
