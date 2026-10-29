"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { preparePhoto } from "@/lib/client/photo";
import type { PhotoUpload } from "@/lib/types";
import { BUTTON } from "./buttons";

type Props = {
  onPhoto: (photo: PhotoUpload) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  variant?: keyof typeof BUTTON;
  className?: string;
  children: ReactNode;
};

const TOUCH = "(pointer: coarse)";

function watchPointer(onChange: () => void) {
  const query = window.matchMedia(TOUCH);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** "Take" on a phone or tablet, where the button opens the camera, and "Choose" on a computer, where it opens files. */
export function usePhotoVerb(): "Take" | "Choose" {
  const touch = useSyncExternalStore(watchPointer, () => window.matchMedia(TOUCH).matches, () => true);
  return touch ? "Take" : "Choose";
}

/**
 * A button that opens the rear camera and hands back a downscaled photo. Desktop
 * browsers have no camera to open, so they show a file picker instead.
 */
export function CaptureButton({
  onPhoto,
  onError,
  disabled,
  variant = "primary",
  className = "",
  children,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={`${BUTTON[variant]} ${className}`}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            onPhoto(await preparePhoto(file));
          } catch (error) {
            onError(error instanceof Error ? error.message : "That photo couldn't be opened.");
          }
        }}
      />
    </>
  );
}
