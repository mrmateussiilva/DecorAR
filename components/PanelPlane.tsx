"use client";

import { TransformControls, useTexture } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEditorStore } from "@/store/useEditorStore";
import type { PanelItem } from "@/types/panel";

type PanelPlaneProps = {
  panel: PanelItem;
  isSelected: boolean;
  transformMode: "translate" | "rotate";
};

export function PanelPlane({ panel, isSelected, transformMode }: PanelPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectPanel = useEditorStore((state) => state.selectPanel);
  const updatePanel = useEditorStore((state) => state.updatePanel);
  const texture = useTexture(panel.imageUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    selectPanel(panel.id);
  };

  const syncTransformToStore = () => {
    const mesh = meshRef.current;
    if (!mesh) return;

    updatePanel(panel.id, {
      position: [mesh.position.x, mesh.position.y, mesh.position.z],
      rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]
    });
  };

  const meshElement = (
    <mesh
      ref={meshRef}
      position={panel.position}
      rotation={panel.rotation}
      onClick={handleSelect}
      castShadow={false}
      receiveShadow={false}
    >
      <planeGeometry args={[panel.width, panel.height]} />
      <meshStandardMaterial
        map={texture}
        color={isSelected ? "#f8fafc" : "#ffffff"}
        side={THREE.DoubleSide}
      />
    </mesh>
  );

  if (!isSelected) {
    return meshElement;
  }

  return (
    <TransformControls mode={transformMode} onObjectChange={syncTransformToStore}>
      {meshElement}
    </TransformControls>
  );
}
