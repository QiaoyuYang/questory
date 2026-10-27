import type { ReactNode } from "react";

/** The action area pinned to the bottom of the screen, clear of the iPhone's home indicator. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-seam/70 bg-asphalt/90 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto w-full max-w-[30rem] px-4">{children}</div>
    </div>
  );
}
