import type { CSSProperties, ReactNode } from "react";

type Props = {
  size: { width: number; height: number } | null;
  /** Opens the picture full screen. */
  onClick?: () => void;
  label?: string;
  children: ReactNode;
};

// --hero-max caps the height so the narration under the picture stays on screen, lower
// on short phones.
const FRAME =
  "relative mx-auto block w-full overflow-hidden rounded-[18px] bg-kerb [--hero-max:min(46svh,34rem)] [@media(max-height:700px)]:[--hero-max:38svh]";

/**
 * The big picture at the top of the story, in the picture's own shape. A tall one gets
 * a narrower frame rather than a crop, so a card's title and caption and a quest's
 * outline always show.
 */
export function HeroFrame({ size, onClick, label, children }: Props) {
  const { width, height } = size ?? { width: 3, height: 4 };
  const style: CSSProperties = {
    aspectRatio: `${width} / ${height}`,
    maxWidth: `calc(var(--hero-max) * ${width} / ${height})`,
  };
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
