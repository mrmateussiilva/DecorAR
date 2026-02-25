"use client";

import { useEditorStore } from "@/store/useEditorStore";
import { PanelPlane } from "@/components/PanelPlane";
import type { PanelItem } from "@/types/panel";

export type ARContentRendererProps = {
  /** Modo dos transform controls quando não em AR. */
  transformMode: "translate" | "rotate";
  /** Se true, desabilita transform e seleção (ex.: em AR ativo). */
  arActive: boolean;
};

/**
 * Renderiza os painéis da store (useEditorStore) como PanelPlane.
 * Conteúdo 3D da cena; visibilidade do grupo pai (ARSceneRoot) deve ser
 * controlada externamente (ex.: visível apenas após placement lock).
 */
export function ARContentRenderer({
  transformMode,
  arActive
}: ARContentRendererProps) {
  const panels = useEditorStore((state) => state.panels);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectPanel = useEditorStore((state) => state.selectPanel);

  return (
    <>
      {panels.map((panel: PanelItem) => (
        <PanelPlane
          key={panel.id}
          panel={panel}
          isSelected={panel.id === selectedId}
          transformMode={transformMode}
          transformEnabled={!arActive}
          selectionEnabled={!arActive}
        />
      ))}
    </>
  );
}
