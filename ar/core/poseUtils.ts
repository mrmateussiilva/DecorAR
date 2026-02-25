import * as THREE from "three";
import type { QuaternionTuple } from "./types";

/**
 * Converte um quaternion do hit-test em um quaternion que mantém o conteúdo
 * vertical (eixo up = mundo Y), preservando apenas o yaw (rotação em torno de Y).
 * Assim a arte fica "em pé" na superfície ancorada, sem deitar com a superfície.
 */
export function quaternionToVerticalYaw(quaternion: QuaternionTuple): QuaternionTuple {
  const q = new THREE.Quaternion(
    quaternion[0],
    quaternion[1],
    quaternion[2],
    quaternion[3]
  );
  const euler = new THREE.Euler().setFromQuaternion(q, "YXZ");
  const yawOnly = new THREE.Euler(0, euler.y, 0, "YXZ");
  const out = new THREE.Quaternion().setFromEuler(yawOnly);
  return [out.x, out.y, out.z, out.w];
}
