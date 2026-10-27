import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fichas técnicas de vidrio",
    short_name: "Fichas",
    description:
      "Generación de fichas técnicas de vidrio, catálogo de productos y seguimiento comercial.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8fafc",
    theme_color: "#0b57d0",
    lang: "es",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/assets/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/assets/pwa/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Productos",
        short_name: "Productos",
        description: "Catálogo de productos",
        url: "/productos",
        icons: [{ src: "/assets/pwa/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Asistente IA",
        short_name: "Asistente",
        description: "Consulta fichas y productos con IA",
        url: "/asistente",
        icons: [{ src: "/assets/pwa/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Nueva ficha",
        short_name: "Nueva ficha",
        description: "Crear una ficha técnica",
        url: "/fichas/nueva",
        icons: [{ src: "/assets/pwa/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
