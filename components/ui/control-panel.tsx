type ControlPanelProps = {
  width: number;
  height: number;
  isUploading: boolean;
  errorMessage: string | null;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onFileChange: (file: File | null) => void;
};

function formatInputValue(value: number) {
  if (Number.isNaN(value)) return "";
  return String(value);
}

export function ControlPanel({
  width,
  height,
  isUploading,
  errorMessage,
  onWidthChange,
  onHeightChange,
  onFileChange
}: ControlPanelProps) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Controles</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Plano texturizado</h2>
        <p className="mt-1 text-sm text-slate-300">
          Faça upload de uma imagem e ajuste o tamanho do plano em metros.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-200">Imagem</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
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
              value={formatInputValue(width)}
              onChange={(event) => onWidthChange(Number(event.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Altura (m)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={formatInputValue(height)}
              onChange={(event) => onHeightChange(Number(event.target.value))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 transition focus:border-sky-400"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/40 p-3 text-xs text-slate-300">
        <p>
          XR-ready: a cena já ativa o renderer com suporte a XR. Integração com sessão WebXR será
          adicionada depois.
        </p>
        {isUploading ? <p className="mt-2 text-sky-300">Carregando textura...</p> : null}
        {errorMessage ? <p className="mt-2 text-rose-300">{errorMessage}</p> : null}
      </div>
    </aside>
  );
}
