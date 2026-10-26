export function Wordmark({ size = "large" }: { size?: "large" | "small" }) {
  return (
    <div className="inline-block">
      <span
        className={`block font-sign font-bold tracking-tight text-paint ${
          size === "large" ? "text-[2.75rem] leading-none" : "text-2xl leading-none"
        }`}
      >
        Questory
      </span>
      <div className={`lane-line ${size === "large" ? "mt-2" : "mt-1 h-[3px]"}`} />
    </div>
  );
}
