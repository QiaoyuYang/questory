/* eslint-disable @next/next/no-img-element */

/** The player's photo, held on screen while the game master works on it. */
export function Working({ photo, message }: { photo: string | null; message: string }) {
  return (
    <section aria-live="polite" aria-busy="true" className="fade-in">
      {photo && (
        <img
          src={photo}
          alt="The photo you just took"
          className="block w-full rounded-[14px] opacity-70 grayscale-[35%]"
        />
      )}
      <div className="lane-line lane-line-moving mt-4" />
      <p className="mt-3 text-concrete">{message}</p>
    </section>
  );
}
