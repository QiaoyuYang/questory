"use client";

import { useRef, type ReactNode } from "react";
import { preparePhoto } from "@/lib/client/photo";
import type { PhotoUpload } from "@/lib/types";

type Props = {
  onPhoto: (photo: PhotoUpload) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
};

const VARIANTS = {
  primary:
    "bg-lane text-asphalt hover:bg-[#ffc933] active:translate-y-px disabled:bg-seam disabled:text-concrete",
  secondary:
    "border-2 border-seam text-paint hover:border-concrete active:translate-y-px disabled:text-concrete",
};

/** A button that opens the rear camera and hands back a downscaled photo. */
export function CaptureButton({ onPhoto, onError, disabled, variant = "primary", className = "", children }: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className={`inline-flex min-h-14 items-center justify-center rounded-[10px] px-5 text-lg font-semibold transition-colors ${VARIANTS[variant]} ${className}`}
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
