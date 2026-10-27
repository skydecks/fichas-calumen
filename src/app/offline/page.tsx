import Link from "next/link";
import { IconRefresh } from "@/components/icons";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="card w-full max-w-md p-8 text-center">
        <img
          src="/assets/pwa/icon-192.png"
          alt=""
          width={72}
          height={72}
          className="mx-auto h-18 w-18 rounded-2xl"
        />
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Sin conexión
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          No hay conexión a internet. Puedes volver a intentarlo cuando
          recuperes la red; los datos guardados en el servidor se actualizarán
          automáticamente.
        </p>
        <Link href="/" className="btn-primary mt-6">
          <IconRefresh width={15} height={15} />
          Reintentar
        </Link>
      </div>
    </main>
  );
}
