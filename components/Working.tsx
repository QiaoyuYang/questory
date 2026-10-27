/* eslint-disable @next/next/no-img-element */
import type { PhotoUpload } from "@/lib/types";
import { HeroFrame } from "./HeroFrame";

/** The player's photo, held on screen while the game master works on it. */
export function Working({ photo, message }: { photo: PhotoUpload | null; message: string }) {
  return (
    <section aria-live="polite" aria-busy="true" className="fade-in">
      {photo && (
        <HeroFrame size={{ width: photo.width, height: photo.height }}>
          <img
            src={photo.photo}
            alt="The photo you just took"
            className="block h-full w-full object-cover opacity-70 grayscale-[35%]"
          />
        </HeroFrame>
      )}
      <div className="lane-line lane-line-moving mt-4" />
      <p className="mt-3 text-concrete">{message}</p>
    </section>
  );
}
