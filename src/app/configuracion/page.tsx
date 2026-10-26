import SettingsPanel from "@/components/SettingsPanel";
import { SpectrumPageHeader } from "@/components/spectrum/page-header";

export const metadata = {
  title: "Configuración · Fichas técnicas",
};

export default function SettingsPage() {
  return (
    <div>
      <SpectrumPageHeader
        eyebrow="Sistema"
        title="Configuración"
        subtitle="Ajusta tu proveedor de IA, la API key, el endpoint y los valores predeterminados de las fichas nuevas."
      />
      <SettingsPanel />
    </div>
  );
}
