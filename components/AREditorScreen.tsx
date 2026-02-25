"use client";

import { useState } from "react";
import { ARProvider } from "@/ar/context";
import { ARCanvas } from "@/components/ARCanvas";
import { EditorUI } from "@/components/EditorUI";

export function AREditorScreen() {
  const [transformMode, setTransformMode] = useState<"translate" | "rotate">("translate");

  return (
    <ARProvider>
      <EditorUI transformMode={transformMode} onTransformModeChange={setTransformMode} />
      <ARCanvas transformMode={transformMode} />
    </ARProvider>
  );
}
