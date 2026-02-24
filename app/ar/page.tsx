import { AREditor } from "@/components/ar/ar-editor";

export default function ARPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col gap-4 lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <AREditor />
      </div>
    </main>
  );
}
