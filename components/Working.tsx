/* eslint-disable @next/next/no-img-element */
import { HeroFrame } from "./HeroFrame";

type Props = {
  /** The photo being worked on: fresh from the camera, or already uploaded. */
  src: string | null;
  size: { width: number; height: number } | null;
  message: string;
};

/** The player's photo, held on screen while the game master works on it. */
export function Working({ src, size, message }: Props) {
  return (
    <section aria-live="polite" aria-busy="true" className="fade-in">
      {src && (
        <HeroFrame size={size}>
          <img src={src} alt="The new photo" className="block h-full w-full object-cover opacity-70 grayscale-[35%]" />
        </HeroFrame>
      )}
      <div className="lane-line lane-line-moving mt-4" />
      <p className="mt-3 text-concrete">{message}</p>
    </section>
  );
}
