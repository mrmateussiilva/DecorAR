"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import type { PanelItem } from "@/types/panel";

type EditorUIProps = {
  transformMode: "translate" | "rotate";
  onTransformModeChange: (mode: "translate" | "rotate") => void;
};

const DEFAULT_WIDTH = 2;
const FALLBACK_HEIGHT = 1.5;

function createPanelId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `panel-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

async function getImageDimensions(imageUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Falha ao ler dimensões da imagem."));
    image.src = imageUrl;
  });
}

function toSafeDimension(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(20, Math.max(0.1, value));
}

function getPanelLabel(panel: PanelItem, index: number) {
  return `Painel ${index + 1}`;
}

export function EditorUI({ transformMode, onTransformModeChange }: EditorUIProps) {
  const panels = useEditorStore((state) => state.panels);
  const selectedId = useEditorStore((state) => state.selectedId);
  const addPanel = useEditorStore((state) => state.addPanel);
  const updatePanel = useEditorStore((state) => state.updatePanel);
  const selectPanel = useEditorStore((state) => state.selectPanel);
  const removePanel = useEditorStore((state) => state.removePanel);

  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.id === selectedId) ?? null,
    [panels, selectedId]
  );

  const [widthInput, setWidthInput] = useState<string>(String(DEFAULT_WIDTH));
  const [heightInput, setHeightInput] = useState<string>(String(FALLBACK_HEIGHT));
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPanel) return;
    setWidthInput(String(selectedPanel.width));
    setHeightInput(String(selectedPanel.height));
  }, [selectedPanel]);

  const applyDimensionsToSelected = (nextWidth: number, nextHeight: number) => {
    if (!selectedPanel) return;
    updatePanel(selectedPanel.id, { width: nextWidth, height: nextHeight });
  };

  const handleWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextRawValue = event.target.value;
    setWidthInput(nextRawValue);

    const parsedValue = Number(nextRawValue);
    if (!selectedPanel || !Number.isFinite(parsedValue)) return;

    applyDimensionsToSelected(
      toSafeDimension(parsedValue, selectedPanel.width),
      toSafeDimension(Number(heightInput), selectedPanel.height)
    );
  };

  const handleHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextRawValue = event.target.value;
    setHeightInput(nextRawValue);

    const parsedValue = Number(nextRawValue);
    if (!selectedPanel || !Number.isFinite(parsedValue)) return;

    applyDimensionsToSelected(
      toSafeDimension(Number(widthInput), selectedPanel.width),
      toSafeDimension(parsedValue, selectedPanel.height)
    );
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);

    const preferredWidth = toSafeDimension(Number(widthInput), DEFAULT_WIDTH);
    const preferredHeight = toSafeDimension(Number(heightInput), FALLBACK_HEIGHT);

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Selecione apenas arquivos de imagem.");
        }

        const imageUrl = URL.createObjectURL(file);
        let height = preferredHeight;

        try {
          const dimensions = await getImageDimensions(imageUrl);
          if (dimensions.width > 0 && dimensions.height > 0) {
            height = (dimensions.height / dimensions.width) * preferredWidth;
          }
        } catch {
          height = preferredHeight;
        }

        addPanel({
          id: createPanelId(),
          imageUrl,
          width: preferredWidth,
          height: toSafeDimension(height, preferredHeight),
          position: [0, 1, 0],
          rotation: [0, 0, 0]
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao adicionar imagens.");
    } finally {
      event.target.value = "";
      setIsUploading(false);
    }
  };

  const handleRemovePanel = (panel: PanelItem) => {
    URL.revokeObjectURL(panel.imageUrl);
    removePanel(panel.id);
  };

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Editor 3D</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Painéis texturizados</h2>
        <p className="mt-1 text-sm text-slate-300">
          Adicione múltiplas imagens e posicione cada painel livremente na cena.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Imagens</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="block w-full cursor-pointer rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-900 hover:file:bg-slate-200"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Largura (m)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={widthInput}
              onChange={handleWidthChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Altura (m)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={heightInput}
              onChange={handleHeightChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400"
            />
          </label>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Transform</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTransformModeChange("translate")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                transformMode === "translate"
                  ? "bg-sky-400 text-slate-950"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              Mover
            </button>
            <button
              type="button"
              onClick={() => onTransformModeChange("rotate")}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                transformMode === "rotate"
                  ? "bg-sky-400 text-slate-950"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              Rotacionar
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Selecione um painel na lista ou na cena para editar.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Painéis</p>
            <span className="text-xs text-slate-400">{panels.length}</span>
          </div>

          {panels.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum painel adicionado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {panels.map((panel, index) => {
                const isSelected = panel.id === selectedId;

                return (
                  <li key={panel.id}>
                    <div
                      className={`flex items-center gap-2 rounded-lg border px-2 py-2 transition ${
                        isSelected
                          ? "border-sky-400/80 bg-sky-400/10"
                          : "border-white/10 bg-white/0 hover:bg-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectPanel(panel.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-slate-100">
                          {getPanelLabel(panel, index)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {panel.width.toFixed(2)}m x {panel.height.toFixed(2)}m
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePanel(panel)}
                        className="rounded-md px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-400/10"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 p-3 text-xs text-slate-300">
        <p>XR-ready: renderer com suporte XR habilitável para futura sessão WebXR.</p>
        {selectedPanel ? (
          <p className="mt-2 text-slate-400">
            Selecionado: pos [{selectedPanel.position.map((n) => n.toFixed(2)).join(", ")}]
          </p>
        ) : null}
        {isUploading ? <p className="mt-2 text-sky-300">Carregando imagens...</p> : null}
        {errorMessage ? <p className="mt-2 text-rose-300">{errorMessage}</p> : null}
      </div>
    </aside>
  );
}
