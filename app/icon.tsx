import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// El brand-mark de la cabecera (14x14, border-radius:5px) escalado a favicon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ec3013",
          borderRadius: "11px",
        }}
      />
    ),
    { ...size },
  );
}
