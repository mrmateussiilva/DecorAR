"use client";

import { useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import { fileToTexture } from "@/lib/texture";
import { clampPlaneDimension } from "@/lib/validators";
import { ControlPanel } from "@/components/ui/control-panel";
import { ARScene } from "./ar-scene";

const DEFAULT_WIDTH = 1.5;
const DEFAULT_HEIGHT = 1;

export function AREditor() {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [height, setHeight] = useState<number>(DEFAULT_HEIGHT);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateWidth = useCallback((nextValue: number) => {
    setWidth(clampPlaneDimension(nextValue));
  }, []);

  const updateHeight = useCallback((nextValue: number) => {
    setHeight(clampPlaneDimension(nextValue));
  }, []);

  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const nextTexture = await fileToTexture(file);
      setTexture((currentTexture) => {
        currentTexture?.dispose();
        return nextTexture;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar a imagem.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return (
    <>
      <ControlPanel
        width={width}
        height={height}
        isUploading={isUploading}
        errorMessage={errorMessage}
        onWidthChange={updateWidth}
        onHeightChange={updateHeight}
        onFileChange={handleFileChange}
      />
      <ARScene width={width} height={height} texture={texture} />
    </>
  );
}
