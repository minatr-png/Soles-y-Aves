import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Sin radio: iOS aplica su propia máscara de esquinas sobre apple-touch-icon.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ec3013",
        }}
      />
    ),
    { ...size },
  );
}
