"use client";

import { create } from "zustand";
import type { PanelItem } from "@/types/panel";

type EditorStore = {
  panels: PanelItem[];
  selectedId: string | null;
  addPanel: (panel: PanelItem) => void;
  updatePanel: (id: string, partialData: Partial<PanelItem>) => void;
  selectPanel: (id: string | null) => void;
  removePanel: (id: string) => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  panels: [],
  selectedId: null,
  addPanel: (panel) =>
    set((state) => ({
      panels: [...state.panels, panel],
      selectedId: panel.id
    })),
  updatePanel: (id, partialData) =>
    set((state) => ({
      panels: state.panels.map((panel) =>
        panel.id === id ? { ...panel, ...partialData, id: panel.id } : panel
      )
    })),
  selectPanel: (id) => set({ selectedId: id }),
  removePanel: (id) =>
    set((state) => ({
      panels: state.panels.filter((panel) => panel.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId
    }))
}));
