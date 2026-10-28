import type { ReactNode } from "react";

type Props = {
  size: { width: number; height: number } | null;
  /** Opens the picture full screen. */
  onClick?: () => void;
  label?: string;
  children: ReactNode;
};

const FRAME =
  "relative block w-full max-h-[min(46svh,34rem)] [@media(max-height:700px)]:max-h-[38svh] overflow-hidden rounded-[18px] bg-kerb";

/**
 * The big picture at the top of the story, in the photo's own shape. A tall photo is
 * cropped so the narration under it stays on screen, more so on short phones; tapping
 * it shows all of it.
 */
export function HeroFrame({ size, onClick, label, children }: Props) {
  const style = { aspectRatio: size ? `${size.width} / ${size.height}` : "3 / 4" };
  if (!onClick) {
    return (
      <div className={FRAME} style={style}>
        {children}
      </div>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`${FRAME} cursor-zoom-in`} style={style}>
      {children}
    </button>
  );
}
