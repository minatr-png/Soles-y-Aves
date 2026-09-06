import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Icono del manifest (512x512). Misma proporción de radio que el brand-mark
// de la cabecera (14px con border-radius:5px, ratio ~0.36).
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ec3013",
          borderRadius: "183px",
        }}
      />
    ),
    { width: 512, height: 512 },
  );
}
