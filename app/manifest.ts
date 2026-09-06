import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ahorros",
    short_name: "Ahorros",
    description: "Cuentas compartidas",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#eceaea",
    theme_color: "#eceaea",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
