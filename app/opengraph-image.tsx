import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#082c3a",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#0eaa9b", letterSpacing: 2 }}>
          SMILE AI MARKETING
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 56,
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          More local patients. Fewer empty chairs.
        </div>
        <svg width="140" height="36" viewBox="0 0 140 36" style={{ marginTop: 40 }}>
          <path
            d="M10 8c10 28 110 28 120 0"
            fill="none"
            stroke="#0eaa9b"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
