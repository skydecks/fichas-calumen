export type KnowledgeCategory =
  | "Norma Oficial"
  | "Guía de Producto"
  | "Criterio de Instalación"
  | "Procedimiento Interno";

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "Norma Oficial",
  "Guía de Producto",
  "Criterio de Instalación",
  "Procedimiento Interno",
];

export const GLASS_FAMILIES = [
  "Vidrio Templado",
  "Vidrio Laminado",
  "Doble Acristalamiento (DGU)",
  "Control Solar y Low-E",
  "Aislamiento Acústico",
  "Vidrio de Seguridad y Contención",
] as const;

export type KnowledgeDocMeta = {
  id: string;
  title: string;
  subtitle?: string;
  category: KnowledgeCategory;
  families: string[];
  standards: string[];
  file: string;
  size: number;
  updatedAt: string;
  isDefault: boolean;
};
