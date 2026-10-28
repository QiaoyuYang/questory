/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef } from "react";
import type { TargetOverlay } from "@/lib/types";
import { TargetOutline } from "./QuestThumb";

export type Zoomed = {
  src: string;
  alt: string;
  size: { width: number; height: number } | null;
  overlay: TargetOverlay | null;
};

/** A photo or card on its own, as big as the screen allows. A tap anywhere closes it. */
export function PhotoViewer({ image, onClose }: { image: Zoomed | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (image && !dialog.open) dialog.showModal();
    if (!image && dialog.open) dialog.close();
  }, [image]);

  const ratio = image?.size ? image.size.width / image.size.height : 3 / 4;

  return (
    <dialog ref={ref} aria-label={image?.alt ?? "Photo"} className="viewer" onClose={onClose} onClick={onClose}>
      {image && (
        <div className="flex h-full w-full items-center justify-center p-4">
          <div
            className="relative"
            // The box keeps the picture's exact shape, so the outline lines up with it.
            style={{ aspectRatio: `${ratio}`, width: `min(100%, calc((100svh - 7rem) * ${ratio}))` }}
          >
            <img src={image.src} alt={image.alt} className="block h-full w-full rounded-[10px] object-cover" />
            {image.overlay && <TargetOutline overlay={image.overlay} />}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 min-h-11 rounded-md px-3 font-semibold text-paint"
      >
        Done
      </button>
    </dialog>
  );
}
