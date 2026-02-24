"use client";

import { useState } from "react";
import { ARCanvas } from "@/components/ARCanvas";
import { EditorUI } from "@/components/EditorUI";

export function AREditorScreen() {
  const [transformMode, setTransformMode] = useState<"translate" | "rotate">("translate");

  return (
    <>
      <EditorUI transformMode={transformMode} onTransformModeChange={setTransformMode} />
      <ARCanvas transformMode={transformMode} />
    </>
  );
}
