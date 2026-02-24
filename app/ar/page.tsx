import { AREditorScreen } from "@/components/AREditorScreen";

export default function ARPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col gap-4 lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <AREditorScreen />
      </div>
    </main>
  );
}
