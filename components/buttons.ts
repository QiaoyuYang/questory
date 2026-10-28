/** Button looks shared by every screen. */
export const BUTTON = {
  primary:
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-lane px-5 text-lg font-semibold whitespace-nowrap text-asphalt transition-colors hover:bg-[#ffc933] active:translate-y-px disabled:bg-seam disabled:text-concrete",
  // For the one action that can't be undone.
  danger:
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-hand px-5 text-lg font-semibold whitespace-nowrap text-asphalt transition-colors hover:bg-[#ff9445] active:translate-y-px disabled:bg-seam disabled:text-concrete",
  secondary:
    "inline-flex min-h-14 items-center justify-center gap-2 rounded-[14px] border-2 border-seam px-5 text-lg font-semibold text-paint transition-colors hover:border-concrete active:translate-y-px",
  // A quieter way out, under the main action.
  link: "inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-concrete underline underline-offset-4 hover:text-paint",
  // An icon over a small label, like the buttons in an iPhone toolbar.
  tool: "inline-flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[12px] px-2 text-xs font-semibold text-concrete transition-colors hover:text-paint active:bg-kerb",
} as const;
