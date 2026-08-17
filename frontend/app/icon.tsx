import { ImageResponse } from "next/og";

// Ana ekran / sekme simgesi — ayrı bir dosya yüklemeye gerek yok,
// Next bunu derleme sırasında PNG'ye çeviriyor.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #059669, #22c55e)",
          color: "white",
          fontSize: 320,
          fontWeight: 700,
        }}
      >
        M
      </div>
    ),
    { ...size }
  );
}
