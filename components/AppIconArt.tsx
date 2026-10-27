/**
 * The app icon, drawn for next/og: a lane-yellow Q over a dashed line, on asphalt.
 * Square and unrounded, because iOS and Android round the corners themselves.
 */
export function AppIconArt({ side }: { side: number }) {
  const s = (fraction: number) => Math.round(side * fraction);
  const lane = "#f4bc1c";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e2227",
      }}
    >
      <div style={{ position: "relative", display: "flex", width: s(0.46), height: s(0.46), marginTop: s(0.04) }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `${s(0.095)}px solid ${lane}` }} />
        <div
          style={{
            position: "absolute",
            right: -s(0.05),
            bottom: s(0.01),
            width: s(0.21),
            height: s(0.095),
            borderRadius: s(0.03),
            background: lane,
            transform: "rotate(45deg)",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: s(0.045), marginTop: s(0.09) }}>
        {[0, 1, 2].map((dash) => (
          <div key={dash} style={{ width: s(0.11), height: s(0.035), borderRadius: s(0.01), background: lane }} />
        ))}
      </div>
    </div>
  );
}
