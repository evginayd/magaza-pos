import type { MetadataRoute } from "next";

/**
 * PWA manifest: ana ekrana eklenen kısayolun tarayıcı sekmesi gibi değil,
 * tam ekran bir uygulama gibi açılmasını sağlar (display: standalone).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mağaza Satış Defteri",
    short_name: "Mağaza",
    description: "Mağaza satış, gider ve gün sonu takibi",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5f9",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
